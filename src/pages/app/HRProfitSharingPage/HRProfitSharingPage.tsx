import { useEffect, useMemo, useState } from "react";

import { authApi, employeeApi, hrProfitSharingApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import { IconTrendingUp } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrEmployeeRecord,
  HrProfitSharingDetail,
  HrProfitSharingPeriod,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

const formatAmount = (value: number | string | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : Number(value).toLocaleString("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const STATUS_VARIANT: Record<HrProfitSharingPeriod["status"], "gray" | "yellow" | "green"> = {
  abierto: "gray",
  calculado: "yellow",
  cerrado: "green",
};

const STATUS_LABEL: Record<HrProfitSharingPeriod["status"], string> = {
  abierto: "Abierto",
  calculado: "Calculado",
  cerrado: "Cerrado",
};

export function HRProfitSharingPage() {
  const [employees, setEmployees] = useState<HrEmployeeRecord[]>([]);
  const [period, setPeriod] = useState<HrProfitSharingPeriod | null>(null);
  const [details, setDetails] = useState<HrProfitSharingDetail[]>([]);
  const [loadPeriodId, setLoadPeriodId] = useState("");

  const [createForm, setCreateForm] = useState({
    fiscal_year: currentYear,
    fiscal_year_start: `${currentYear}-01-01`,
    fiscal_year_end: `${currentYear}-12-31`,
    is_non_profit: false,
  });
  const [liquidBenefits, setLiquidBenefits] = useState("");

  const [bonusEmployeeId, setBonusEmployeeId] = useState("");
  const [bonusYear, setBonusYear] = useState(currentYear);
  const [bonusPreview, setBonusPreview] = useState<{
    amount?: string;
    [key: string]: unknown;
  } | null>(null);

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

  const employeeName = (id: string) => {
    const emp = employees.find((e) => e.employee_id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : id;
  };

  const reloadDetails = async (periodId: string) => {
    setDetails(await hrProfitSharingApi.listDetails(periodId));
  };

  const handleCreatePeriod = async () => {
    setIsSubmitting(true);
    try {
      const created = await hrProfitSharingApi.createPeriod(createForm);
      setPeriod(created);
      setDetails([]);
      setToast({ mode: "success", message: "Periodo creado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error creando periodo",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadPeriod = async () => {
    if (!loadPeriodId) return;
    setIsLoading(true);
    try {
      const loaded = await hrProfitSharingApi.getPeriod(loadPeriodId);
      setPeriod(loaded);
      await reloadDetails(loadPeriodId);
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error cargando periodo",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetLiquidBenefits = async () => {
    if (!period) return;
    const value = parseFloat(liquidBenefits);
    if (!value || value < 0) {
      setToast({ mode: "error", message: "Ingresa un monto de beneficios líquidos válido" });
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await hrProfitSharingApi.setLiquidBenefits(
        period.profit_period_id,
        { liquid_benefits: value },
      );
      setPeriod(updated);
      setLiquidBenefits("");
      setToast({ mode: "success", message: "Beneficios líquidos registrados" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error registrando beneficios",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculate = async () => {
    if (!period) return;
    setIsSubmitting(true);
    try {
      await hrProfitSharingApi.calculate(period.profit_period_id);
      const refreshed = await hrProfitSharingApi.getPeriod(
        period.profit_period_id,
      );
      setPeriod(refreshed);
      await reloadDetails(period.profit_period_id);
      setToast({ mode: "success", message: "Reparto calculado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error calculando reparto",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!period) return;
    setIsSubmitting(true);
    try {
      const closed = await hrProfitSharingApi.close(period.profit_period_id);
      setPeriod(closed);
      setToast({ mode: "success", message: "Periodo cerrado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error cerrando periodo",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBonusPreview = async () => {
    if (!bonusEmployeeId) return;
    setIsSubmitting(true);
    try {
      const result = await hrProfitSharingApi.yearEndBonusPreview(
        bonusEmployeeId,
        bonusYear,
      );
      setBonusPreview(result as { amount?: string });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error calculando bonificación de fin de año",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayBonus = async () => {
    if (!bonusEmployeeId || !bonusPreview?.amount) return;
    setIsSubmitting(true);
    try {
      await hrProfitSharingApi.payYearEndBonus({
        employee_id: bonusEmployeeId,
        fiscal_year: bonusYear,
        amount: Number(bonusPreview.amount),
        paid_at: todayIso(),
      });
      setBonusPreview(null);
      setToast({ mode: "success", message: "Bonificación pagada correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error pagando bonificación de fin de año",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const detailColumns: Column[] = [
    {
      key: "employee_id",
      label: "Empleado",
      width: "34%",
      render: (value: string) => employeeName(value),
    },
    {
      key: "earned_salary",
      label: "Salario devengado",
      width: "22%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    { key: "complete_months", label: "Meses completos", width: "22%" },
    {
      key: "final_amount",
      label: "Monto final",
      width: "22%",
      render: (value: number | string | null) => (
        <span className="font-mono">{formatAmount(value)}</span>
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
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Utilidades</h1>
        <p className="text-gray-600">
          Reparto de beneficios líquidos (Art. 131) y bonificación de fin de
          año (Art. 132).
        </p>
      </div>

      {!period && (
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Crear periodo de reparto
            </h2>
            <div className="space-y-4">
              <Input
                label="Año fiscal"
                type="number"
                value={createForm.fiscal_year}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    fiscal_year: Number(e.target.value),
                  }))
                }
              />
              <Input
                label="Inicio del ejercicio"
                type="date"
                value={createForm.fiscal_year_start}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    fiscal_year_start: e.target.value,
                  }))
                }
              />
              <Input
                label="Fin del ejercicio"
                type="date"
                value={createForm.fiscal_year_end}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    fiscal_year_end: e.target.value,
                  }))
                }
              />
              <Select
                label="Tipo de entidad"
                value={createForm.is_non_profit ? "yes" : "no"}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    is_non_profit: e.target.value === "yes",
                  }))
                }
                options={[
                  { value: "no", label: "Con fines de lucro" },
                  {
                    value: "yes",
                    label: "Sin fines de lucro (bonificación mín. 30 días)",
                  },
                ]}
              />
              <Button onClick={handleCreatePeriod} loading={isSubmitting}>
                Crear periodo
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Cargar periodo existente
            </h2>
            <div className="space-y-4">
              <Input
                label="ID del periodo"
                value={loadPeriodId}
                onChange={(e) => setLoadPeriodId(e.target.value)}
                hint="El profit_period_id devuelto al crear el periodo."
              />
              <Button
                variant="secondary"
                onClick={handleLoadPeriod}
                loading={isLoading}
              >
                Cargar
              </Button>
            </div>
          </div>
        </div>
      )}

      {period && (
        <>
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-300 bg-white p-6">
            <div>
              <p className="text-sm text-gray-600">
                Periodo {period.fiscal_year}{" "}
                <Badge variant={STATUS_VARIANT[period.status]}>
                  {STATUS_LABEL[period.status]}
                </Badge>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                ID: {period.profit_period_id}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setPeriod(null)}>
              Cambiar de periodo
            </Button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <StatCard
              label="Beneficios líquidos"
              value={formatAmount(period.liquid_benefits)}
              icon={<IconTrendingUp />}
            />
            <StatCard
              label="Monto repartible"
              value={formatAmount(period.distributable_amount)}
              icon={<IconTrendingUp />}
              accent
            />
            <StatCard
              label="% de reparto"
              value={Number(period.distribution_percentage).toLocaleString(
                "es-VE",
                { style: "percent", maximumFractionDigits: 2 },
              )}
              icon={<IconTrendingUp />}
            />
          </div>

          {period.status === "abierto" && (
            <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-gray-300 bg-white p-6">
              <Input
                label="Registrar beneficios líquidos"
                type="number"
                step="0.01"
                value={liquidBenefits}
                onChange={(e) => setLiquidBenefits(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleSetLiquidBenefits}
                loading={isSubmitting}
              >
                Guardar
              </Button>
              <Button
                variant="secondary"
                onClick={handleCalculate}
                loading={isSubmitting}
                disabled={!period.liquid_benefits}
              >
                Calcular reparto
              </Button>
            </div>
          )}

          {period.status === "calculado" && (
            <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
              <Button onClick={handleClose} loading={isSubmitting}>
                Cerrar periodo
              </Button>
            </div>
          )}

          <div className="rounded-2xl border border-gray-300 bg-white p-6">
            <Table
              columns={detailColumns}
              data={details}
              isLoading={isLoading}
              emptyMessage="Todavía no hay reparto calculado para este periodo."
            />
          </div>
        </>
      )}

      <section className="mt-6 rounded-2xl border border-gray-300 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Bonificación de fin de año (Art. 132)
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="Empleado"
            value={bonusEmployeeId}
            onChange={(e) => setBonusEmployeeId(e.target.value)}
            options={employeeOptions}
            placeholder="Selecciona un empleado"
          />
          <Input
            label="Año fiscal"
            type="number"
            value={bonusYear}
            onChange={(e) => setBonusYear(Number(e.target.value))}
          />
          <div className="flex items-end gap-3">
            <Button
              variant="secondary"
              onClick={handleBonusPreview}
              loading={isSubmitting}
            >
              Calcular
            </Button>
            {bonusPreview?.amount && (
              <Button onClick={handlePayBonus} loading={isSubmitting}>
                Pagar {formatAmount(bonusPreview.amount)}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
