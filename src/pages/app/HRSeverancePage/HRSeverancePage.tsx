import { useEffect, useMemo, useState } from "react";

import { authApi, employeeApi, hrSeveranceApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import { IconCreditCard } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrEmployeeRecord,
  HrSeveranceAdvance,
  HrSeveranceBalance,
  HrSeveranceDeposit,
  HrSeveranceInterest,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatAmount = (value: number | string | null) =>
  value === null
    ? "—"
    : Number(value).toLocaleString("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const LOCATION_OPTIONS = [
  { value: "fideicomiso", label: "Fideicomiso individual" },
  { value: "fondo_nacional", label: "Fondo Nacional de Prestaciones" },
  { value: "contabilidad", label: "Contabilidad de la entidad" },
];

const REASON_OPTIONS = [
  { value: "vivienda", label: "Vivienda" },
  { value: "hipoteca", label: "Liberación de hipoteca" },
  { value: "educacion", label: "Educación" },
  { value: "salud", label: "Gastos médicos" },
];

const ADVANCE_STATUS_VARIANT: Record<
  HrSeveranceAdvance["status"],
  "gray" | "green" | "red"
> = {
  pendiente: "gray",
  aprobado: "green",
  rechazado: "red",
};

export function HRSeverancePage() {
  const [employees, setEmployees] = useState<HrEmployeeRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [balance, setBalance] = useState<HrSeveranceBalance | null>(null);
  const [deposits, setDeposits] = useState<HrSeveranceDeposit[]>([]);
  const [interest, setInterest] = useState<HrSeveranceInterest[]>([]);
  const [advances, setAdvances] = useState<HrSeveranceAdvance[]>([]);
  const [availableAdvance, setAvailableAdvance] = useState<string | null>(
    null,
  );

  const [depositUntil, setDepositUntil] = useState(todayIso());
  const [depositLocation, setDepositLocation] = useState("fideicomiso");
  const [interestFrom, setInterestFrom] = useState(todayIso());
  const [interestTo, setInterestTo] = useState(todayIso());
  const [advanceForm, setAdvanceForm] = useState({
    requested_amount: "",
    reason: "vivienda",
    reason_detail: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ mode: ToastMode; message: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const currentUser = await authApi.getCurrentUser();
      const tenantId = currentUser?.tenant?.tenant_id ?? "";
      if (!tenantId) return;
      setEmployees(await employeeApi.listByTenant(tenantId));
    })();
  }, []);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.employee_id,
        label: `${e.first_name} ${e.last_name}`,
      })),
    [employees],
  );

  const reload = async (empId: string) => {
    if (!empId) return;
    setIsLoading(true);
    try {
      const [balanceResult, depositsResult, interestResult, advancesResult, availableResult] =
        await Promise.all([
          hrSeveranceApi.balance(empId),
          hrSeveranceApi.listDeposits(empId),
          hrSeveranceApi.listInterest(empId),
          hrSeveranceApi.listAdvances(empId),
          hrSeveranceApi.availableAdvance(empId) as Promise<{
            available: string;
          }>,
        ]);
      setBalance(balanceResult);
      setDeposits(depositsResult);
      setInterest(interestResult);
      setAdvances(advancesResult);
      setAvailableAdvance(
        (availableResult as { available?: string })?.available ?? null,
      );
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error cargando datos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) reload(employeeId);
    else {
      setBalance(null);
      setDeposits([]);
      setInterest([]);
      setAdvances([]);
      setAvailableAdvance(null);
    }
  }, [employeeId]);

  const handleGenerateDeposits = async () => {
    if (!employeeId) return;
    setIsSubmitting(true);
    try {
      await hrSeveranceApi.generateDeposits({
        employee_id: employeeId,
        until: depositUntil,
        location: depositLocation as "fideicomiso" | "fondo_nacional" | "contabilidad",
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Trimestres generados correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error generando depósitos",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDeposited = async (depositId: string) => {
    setIsSubmitting(true);
    try {
      await hrSeveranceApi.updateDeposit(depositId, {
        deposit_made: true,
        deposit_date: todayIso(),
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Depósito marcado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error actualizando depósito",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInterest = async () => {
    if (!employeeId) return;
    setIsSubmitting(true);
    try {
      await hrSeveranceApi.generateInterest({
        employee_id: employeeId,
        from: interestFrom,
        to: interestTo,
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Intereses generados correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error generando intereses",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdvance = async () => {
    if (!employeeId) return;
    const amount = parseFloat(advanceForm.requested_amount);
    if (!amount || amount <= 0) {
      setToast({ mode: "error", message: "Ingresa un monto de anticipo válido" });
      return;
    }
    setIsSubmitting(true);
    try {
      await hrSeveranceApi.createAdvance({
        employee_id: employeeId,
        requested_amount: amount,
        reason: advanceForm.reason as "vivienda" | "hipoteca" | "educacion" | "salud",
        reason_detail: advanceForm.reason_detail || undefined,
      });
      setAdvanceForm({ requested_amount: "", reason: "vivienda", reason_detail: "" });
      await reload(employeeId);
      setToast({ mode: "success", message: "Anticipo solicitado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error solicitando anticipo",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAdvance = async (advanceId: string, requested: number) => {
    setIsSubmitting(true);
    try {
      await hrSeveranceApi.approveAdvance(advanceId, {
        approved_amount: requested,
        resolution_date: todayIso(),
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Anticipo aprobado" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error aprobando anticipo",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAdvance = async (advanceId: string) => {
    setIsSubmitting(true);
    try {
      await hrSeveranceApi.rejectAdvance(advanceId, {
        resolution_date: todayIso(),
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Anticipo rechazado" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error rechazando anticipo",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const depositColumns: Column[] = [
    {
      key: "quarter_start",
      label: "Trimestre",
      width: "28%",
      render: (_v: unknown, row: HrSeveranceDeposit) =>
        `${row.quarter_start.slice(0, 10)} — ${row.quarter_end.slice(0, 10)}`,
    },
    { key: "days", label: "Días", width: "10%" },
    {
      key: "amount",
      label: "Monto",
      width: "16%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    { key: "location", label: "Ubicación", width: "18%" },
    {
      key: "deposit_made",
      label: "Depositado",
      width: "14%",
      render: (value: boolean, row: HrSeveranceDeposit) => (
        <Badge variant={value ? "green" : "gray"}>
          {value ? row.deposit_date?.slice(0, 10) : "Pendiente"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "14%",
      render: (_v: unknown, row: HrSeveranceDeposit) =>
        !row.deposit_made && (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleMarkDeposited(row.deposit_id)}
              loading={isSubmitting}
            >
              Marcar depositado
            </Button>
          </div>
        ),
    },
  ];

  const interestColumns: Column[] = [
    {
      key: "period_month",
      label: "Mes",
      width: "16%",
      render: (value: string) => value.slice(0, 10),
    },
    {
      key: "balance_base",
      label: "Saldo base",
      width: "18%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    {
      key: "applied_rate",
      label: "Tasa",
      width: "14%",
      render: (value: number | string) => (
        <span className="font-mono">
          {Number(value).toLocaleString("es-VE", {
            style: "percent",
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    { key: "rate_kind", label: "Tipo de tasa", width: "18%" },
    {
      key: "amount",
      label: "Monto",
      width: "18%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    {
      key: "capitalized",
      label: "Capitalizado",
      width: "16%",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "gray"}>{value ? "Sí" : "No"}</Badge>
      ),
    },
  ];

  const advanceColumns: Column[] = [
    {
      key: "request_date",
      label: "Fecha",
      width: "16%",
      render: (value: string) => value.slice(0, 10),
    },
    {
      key: "requested_amount",
      label: "Solicitado",
      width: "18%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    { key: "reason", label: "Motivo", width: "18%" },
    {
      key: "status",
      label: "Estado",
      width: "16%",
      render: (value: HrSeveranceAdvance["status"]) => (
        <Badge variant={ADVANCE_STATUS_VARIANT[value]}>{value}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "32%",
      render: (_v: unknown, row: HrSeveranceAdvance) =>
        row.status === "pendiente" && (
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                handleApproveAdvance(row.advance_id, Number(row.requested_amount))
              }
              loading={isSubmitting}
            >
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleRejectAdvance(row.advance_id)}
              loading={isSubmitting}
            >
              Rechazar
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Prestaciones sociales
        </h1>
        <p className="text-gray-600">
          Garantía trimestral, intereses y anticipos sobre la garantía de
          prestaciones (Arts. 142, 143, 144).
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <Select
          label="Empleado"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={employeeOptions}
          placeholder="Selecciona un empleado"
        />
      </div>

      {employeeId && (
        <>
          {balance && (
            <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
              <StatCard
                label="Depositado"
                value={formatAmount(balance.depositedAmount)}
                icon={<IconCreditCard />}
              />
              <StatCard
                label="Intereses capitalizados"
                value={formatAmount(balance.capitalizedInterest)}
                icon={<IconCreditCard />}
              />
              <StatCard
                label="Anticipos aprobados"
                value={formatAmount(balance.advancesApproved)}
                icon={<IconCreditCard />}
              />
              <StatCard
                label="Saldo de garantía"
                value={formatAmount(balance.balance)}
                icon={<IconCreditCard />}
                accent
              />
            </div>
          )}

          <section className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Garantía trimestral (Art. 142.a)
            </h2>
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <Input
                label="Generar hasta"
                type="date"
                value={depositUntil}
                onChange={(e) => setDepositUntil(e.target.value)}
              />
              <Select
                label="Ubicación de la garantía"
                value={depositLocation}
                onChange={(e) => setDepositLocation(e.target.value)}
                options={LOCATION_OPTIONS}
              />
              <Button
                variant="secondary"
                onClick={handleGenerateDeposits}
                loading={isSubmitting}
              >
                Generar trimestres
              </Button>
            </div>
            <Table
              columns={depositColumns}
              data={deposits}
              isLoading={isLoading}
              emptyMessage="No hay depósitos generados."
            />
          </section>

          <section className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Intereses sobre la garantía (Art. 143)
            </h2>
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <Input
                label="Desde"
                type="date"
                value={interestFrom}
                onChange={(e) => setInterestFrom(e.target.value)}
              />
              <Input
                label="Hasta"
                type="date"
                value={interestTo}
                onChange={(e) => setInterestTo(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleGenerateInterest}
                loading={isSubmitting}
              >
                Generar intereses
              </Button>
            </div>
            <Table
              columns={interestColumns}
              data={interest}
              isLoading={isLoading}
              emptyMessage="No hay intereses generados."
            />
          </section>

          <section className="rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Anticipos sobre la garantía (Art. 144)
              {availableAdvance && (
                <span className="ml-2 font-normal text-gray-400">
                  Disponible: {formatAmount(availableAdvance)}
                </span>
              )}
            </h2>
            <div className="mb-4 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Monto solicitado"
                type="number"
                step="0.01"
                value={advanceForm.requested_amount}
                onChange={(e) =>
                  setAdvanceForm((p) => ({
                    ...p,
                    requested_amount: e.target.value,
                  }))
                }
              />
              <Select
                label="Motivo"
                value={advanceForm.reason}
                onChange={(e) =>
                  setAdvanceForm((p) => ({ ...p, reason: e.target.value }))
                }
                options={REASON_OPTIONS}
              />
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={handleCreateAdvance}
                  loading={isSubmitting}
                >
                  Solicitar anticipo
                </Button>
              </div>
            </div>
            <Table
              columns={advanceColumns}
              data={advances}
              isLoading={isLoading}
              emptyMessage="No hay anticipos registrados."
            />
          </section>
        </>
      )}
    </div>
  );
}
