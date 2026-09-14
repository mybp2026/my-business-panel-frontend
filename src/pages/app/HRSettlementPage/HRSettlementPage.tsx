import { useEffect, useMemo, useState } from "react";

import { authApi, employeeApi, hrSettlementApi } from "@/api";

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
  HrSettlement,
  HrSettlementItem,
  HrSettlementPreview,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatAmount = (value: number | string | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : Number(value).toLocaleString("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const STATUS_VARIANT: Record<HrSettlement["status"], "gray" | "yellow" | "green" | "red"> = {
  borrador: "gray",
  calculada: "yellow",
  pagada: "green",
  anulada: "red",
};

const STATUS_LABEL: Record<HrSettlement["status"], string> = {
  borrador: "Borrador",
  calculada: "Calculada",
  pagada: "Pagada",
  anulada: "Anulada",
};

export function HRSettlementPage() {
  const [employees, setEmployees] = useState<HrEmployeeRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [terminationDate, setTerminationDate] = useState(todayIso());
  const [preview, setPreview] = useState<HrSettlementPreview | null>(null);
  const [settlement, setSettlement] = useState<HrSettlement | null>(null);
  const [overdue, setOverdue] = useState<HrSettlement[]>([]);
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [voidReason, setVoidReason] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ mode: ToastMode; message: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const currentUser = await authApi.getCurrentUser();
      const tenantId = currentUser?.tenant?.tenant_id ?? "";
      if (tenantId) setEmployees(await employeeApi.listByTenant(tenantId));
      try {
        setOverdue(await hrSettlementApi.overdue());
      } catch {
        // no bloquea la pantalla si el listado de vencidas falla
      }
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

  const handlePreview = async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setSettlement(null);
    try {
      const result = await hrSettlementApi.preview(
        employeeId,
        terminationDate,
      );
      setPreview(result);
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error calculando el preview",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!employeeId) return;
    setIsSubmitting(true);
    try {
      const created = await hrSettlementApi.create({
        employee_id: employeeId,
        termination_date: terminationDate,
      });
      setSettlement(created);
      setToast({ mode: "success", message: "Liquidación creada correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error creando la liquidación",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = async () => {
    if (!settlement) return;
    setIsSubmitting(true);
    try {
      const paid = await hrSettlementApi.pay(settlement.settlement_id, {
        payment_date: paymentDate,
      });
      setSettlement(paid);
      setToast({ mode: "success", message: "Liquidación pagada correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error pagando la liquidación",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!settlement) return;
    if (!confirm("¿Anular esta liquidación? Esta acción no se puede deshacer."))
      return;
    setIsSubmitting(true);
    try {
      const voided = await hrSettlementApi.voidSettlement(
        settlement.settlement_id,
        voidReason || undefined,
      );
      setSettlement(voided);
      setToast({ mode: "success", message: "Liquidación anulada" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error anulando la liquidación",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const items = settlement?.items ?? preview?.items ?? [];

  const itemColumns: Column[] = [
    { key: "code", label: "Código", width: "12%" },
    { key: "concept_name", label: "Concepto", width: "28%" },
    { key: "article", label: "Artículo", width: "14%" },
    { key: "salary_basis", label: "Base", width: "14%" },
    {
      key: "amount",
      label: "Monto",
      width: "16%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
  ];

  const overdueColumns: Column[] = [
    {
      key: "employee_id",
      label: "Empleado",
      width: "34%",
      render: (value: string) => employeeName(value),
    },
    {
      key: "payment_due_date",
      label: "Vencimiento",
      width: "22%",
      render: (value: string) => value.slice(0, 10),
    },
    {
      key: "total",
      label: "Total",
      width: "22%",
      render: (value: number | string | null) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      width: "22%",
      render: (value: HrSettlement["status"]) => (
        <Badge variant={STATUS_VARIANT[value]}>{STATUS_LABEL[value]}</Badge>
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
          Liquidación final
        </h1>
        <p className="text-gray-600">
          Prestaciones (Art. 142, MAX entre garantía y retroactivo),
          vacaciones y utilidades fraccionadas, indemnización (Art. 92) y
          mora (Art. 142.f), en un único desglose auditable.
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Liquidaciones con pago vencido (&gt; 5 días, Art. 142.f)
          </h2>
          <Table
            columns={overdueColumns}
            data={overdue}
            emptyMessage="No hay liquidaciones vencidas."
          />
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Empleado"
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setPreview(null);
              setSettlement(null);
            }}
            options={employeeOptions}
            placeholder="Selecciona un empleado"
          />
          <Input
            label="Fecha de egreso"
            type="date"
            value={terminationDate}
            onChange={(e) => setTerminationDate(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={handlePreview}
            loading={isLoading}
            disabled={!employeeId}
          >
            Ver preview
          </Button>
        </div>
      </div>

      {(preview || settlement) && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
            <StatCard
              label="Prestaciones (142.d)"
              value={formatAmount(
                settlement?.severance_amount ?? preview?.severanceAmount,
              )}
              sublabel={`Vía: ${settlement?.selected_via ?? preview?.selectedVia}`}
              icon={<IconCreditCard />}
            />
            <StatCard
              label="Indemnización (92)"
              value={formatAmount(preview?.indemnityAmount)}
              icon={<IconCreditCard />}
            />
            <StatCard
              label="Mora (142.f)"
              value={formatAmount(settlement?.mora_amount ?? preview?.moraAmount)}
              sublabel={`${settlement?.mora_days ?? preview?.moraDays ?? 0} días`}
              icon={<IconCreditCard />}
            />
            <StatCard
              label="Total"
              value={formatAmount(settlement?.total ?? preview?.total)}
              icon={<IconCreditCard />}
              accent
            />
          </div>

          <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
            <Table
              columns={itemColumns}
              data={items as HrSettlementItem[]}
              emptyMessage="Sin desglose disponible."
            />
          </div>

          {!settlement && preview && (
            <div className="mb-6 flex justify-end">
              <Button onClick={handleCreate} loading={isSubmitting}>
                Crear liquidación
              </Button>
            </div>
          )}

          {settlement && settlement.status === "calculada" && (
            <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
              <p className="mb-4 text-sm font-medium text-gray-600">
                Liquidación{" "}
                <Badge variant={STATUS_VARIANT[settlement.status]}>
                  {STATUS_LABEL[settlement.status]}
                </Badge>{" "}
                — vence {settlement.payment_due_date.slice(0, 10)}
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <Input
                  label="Fecha de pago"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <Button onClick={handlePay} loading={isSubmitting}>
                  Pagar
                </Button>
                <Input
                  label="Motivo de anulación (opcional)"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                />
                <Button
                  variant="danger"
                  onClick={handleVoid}
                  loading={isSubmitting}
                >
                  Anular
                </Button>
              </div>
            </div>
          )}

          {settlement && settlement.status === "pagada" && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Pagada el {settlement.payment_date?.slice(0, 10)}.
            </div>
          )}
        </>
      )}
    </div>
  );
}
