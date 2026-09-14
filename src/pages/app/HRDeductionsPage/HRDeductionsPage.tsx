import { useEffect, useMemo, useState } from "react";

import { authApi, employeeApi, hrDeductionsApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import { IconCreditCard, IconPlus } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrEmployeeDeduction,
  HrEmployeeRecord,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatAmount = (value: number | string | null) =>
  value === null
    ? "—"
    : Number(value).toLocaleString("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const KIND_OPTIONS = [
  { value: "deuda_patrono", label: "Deuda con el patrono" },
  { value: "sindical", label: "Cuota sindical" },
  { value: "alimentaria", label: "Pensión alimentaria" },
  { value: "otra", label: "Otra" },
];

const KIND_LABEL: Record<string, string> = {
  deuda_patrono: "Deuda con el patrono",
  sindical: "Cuota sindical",
  alimentaria: "Pensión alimentaria",
  otra: "Otra",
};

export function HRDeductionsPage() {
  const [employees, setEmployees] = useState<HrEmployeeRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [deductions, setDeductions] = useState<HrEmployeeDeduction[]>([]);
  const [margin, setMargin] = useState<string | null>(null);

  const [form, setForm] = useState({
    kind: "deuda_patrono",
    description: "",
    total_amount: "",
    installment_amount: "",
    union_organization: "",
    authorized: false,
    authorization_date: todayIso(),
    start_date: todayIso(),
  });

  const [applyAmount, setApplyAmount] = useState<Record<string, string>>({});

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
      const [list, marginResult] = await Promise.all([
        hrDeductionsApi.listByEmployee(empId),
        hrDeductionsApi
          .availableMargin(empId, todayIso())
          .catch(() => null),
      ]);
      setDeductions(list);
      setMargin(
        (marginResult as { margin?: string } | null)?.margin ?? null,
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
      setDeductions([]);
      setMargin(null);
    }
  }, [employeeId]);

  const handleCreate = async () => {
    if (!employeeId) return;
    const total = parseFloat(form.total_amount);
    if (!form.description.trim() || !total || total <= 0) {
      setToast({ mode: "error", message: "Descripción y monto total son requeridos" });
      return;
    }
    if (form.kind === "sindical" && !form.authorized) {
      setToast({
        mode: "error",
        message: "La cuota sindical requiere autorización expresa (Arts. 412, 413)",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await hrDeductionsApi.create({
        employee_id: employeeId,
        kind: form.kind as "deuda_patrono" | "sindical" | "alimentaria" | "otra",
        description: form.description.trim(),
        total_amount: total,
        installment_amount: form.installment_amount
          ? parseFloat(form.installment_amount)
          : undefined,
        union_organization: form.union_organization || undefined,
        authorized: form.authorized,
        authorization_date: form.authorized
          ? form.authorization_date
          : undefined,
        start_date: form.start_date,
      });
      setForm({
        kind: "deuda_patrono",
        description: "",
        total_amount: "",
        installment_amount: "",
        union_organization: "",
        authorized: false,
        authorization_date: todayIso(),
        start_date: todayIso(),
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Deducción registrada correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error creando la deducción",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = async (deductionId: string) => {
    const amount = parseFloat(applyAmount[deductionId] ?? "");
    if (!amount || amount <= 0) {
      setToast({ mode: "error", message: "Ingresa un monto válido para aplicar" });
      return;
    }
    setIsSubmitting(true);
    try {
      await hrDeductionsApi.apply(deductionId, {
        amount,
        applied_at: todayIso(),
      });
      setApplyAmount((p) => ({ ...p, [deductionId]: "" }));
      await reload(employeeId);
      setToast({ mode: "success", message: "Pago aplicado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error aplicando el pago",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (deductionId: string) => {
    setIsSubmitting(true);
    try {
      await hrDeductionsApi.update(deductionId, { is_active: false });
      await reload(employeeId);
      setToast({ mode: "success", message: "Deducción desactivada" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error desactivando la deducción",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "kind",
      label: "Tipo",
      width: "18%",
      render: (value: string) => KIND_LABEL[value] ?? value,
    },
    { key: "description", label: "Descripción", width: "26%" },
    {
      key: "outstanding_balance",
      label: "Saldo pendiente",
      width: "16%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    {
      key: "is_active",
      label: "Estado",
      width: "12%",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "gray"}>
          {value ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "28%",
      render: (_v: unknown, row: HrEmployeeDeduction) =>
        row.is_active &&
        Number(row.outstanding_balance) > 0 && (
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              type="number"
              step="0.01"
              value={applyAmount[row.deduction_id] ?? ""}
              onChange={(e) =>
                setApplyAmount((p) => ({
                  ...p,
                  [row.deduction_id]: e.target.value,
                }))
              }
              className="w-28"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleApply(row.deduction_id)}
              loading={isSubmitting}
            >
              Aplicar pago
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDeactivate(row.deduction_id)}
              loading={isSubmitting}
            >
              Desactivar
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
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Deducciones</h1>
        <p className="text-gray-600">
          Deudas con el patrono, cuotas sindicales y otras deducciones, con
          topes de descuento por periodo (Arts. 154, 412, 413).
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
          {margin && (
            <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <StatCard
                label="Margen disponible este periodo (Art. 154)"
                value={formatAmount(margin)}
                icon={<IconCreditCard />}
                accent
              />
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Nueva deducción
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Select
                label="Tipo"
                value={form.kind}
                onChange={(e) =>
                  setForm((p) => ({ ...p, kind: e.target.value }))
                }
                options={KIND_OPTIONS}
              />
              <Input
                label="Descripción"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
              <Input
                label="Monto total"
                type="number"
                step="0.01"
                value={form.total_amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, total_amount: e.target.value }))
                }
              />
              <Input
                label="Cuota periódica (opcional)"
                type="number"
                step="0.01"
                value={form.installment_amount}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    installment_amount: e.target.value,
                  }))
                }
              />
              <Input
                label="Fecha de inicio"
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, start_date: e.target.value }))
                }
              />
              {form.kind === "sindical" && (
                <Input
                  label="Organización sindical"
                  value={form.union_organization}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      union_organization: e.target.value,
                    }))
                  }
                />
              )}
              <Select
                label="Autorizado por el trabajador"
                value={form.authorized ? "yes" : "no"}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    authorized: e.target.value === "yes",
                  }))
                }
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
                hint={
                  form.kind === "sindical"
                    ? "Obligatorio para cuota sindical (Arts. 412, 413)."
                    : undefined
                }
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreate} loading={isSubmitting}>
                <IconPlus />
                Registrar deducción
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-6">
            <Table
              columns={columns}
              data={deductions}
              isLoading={isLoading}
              emptyMessage="No hay deducciones registradas."
            />
          </div>
        </>
      )}
    </div>
  );
}
