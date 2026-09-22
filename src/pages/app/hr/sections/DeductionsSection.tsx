import { useEffect, useState } from "react";

import { hrDeductionsApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { useHrEmployee } from "@/context/HrEmployeeContext";

import { IconCreditCard, IconPlus } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { HrEmployeeDeduction } from "@/interfaces/entities/Hr.interface";

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

const emptyForm = () => ({
  kind: "deuda_patrono",
  description: "",
  total_amount: "",
  installment_amount: "",
  union_organization: "",
  authorized: false,
  authorization_date: todayIso(),
  authorization_ref: "",
  start_date: todayIso(),
});

export function DeductionsSection() {
  const { employeeId } = useHrEmployee();

  const [deductions, setDeductions] = useState<HrEmployeeDeduction[]>([]);
  const [margin, setMargin] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [applyAmount, setApplyAmount] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const reload = async (empId: string) => {
    if (!empId) return;
    setIsLoading(true);
    try {
      const [list, marginResult] = await Promise.all([
        hrDeductionsApi.listByEmployee(empId),
        hrDeductionsApi.availableMargin(empId, todayIso()).catch(() => null),
      ]);
      setDeductions(list);
      setMargin((marginResult as { margin?: string } | null)?.margin ?? null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const requiresAuthorization = form.kind === "sindical";

  const handleCreate = async () => {
    if (!employeeId) return;
    const total = parseFloat(form.total_amount);
    if (!form.description.trim() || !total || total <= 0) {
      setToast({
        mode: "error",
        message: "Descripción y monto total son requeridos",
      });
      return;
    }
    if (requiresAuthorization && !form.authorized) {
      setToast({
        mode: "error",
        message:
          "La cuota sindical requiere autorización expresa (Arts. 412, 413)",
      });
      return;
    }
    if (form.authorized && !form.authorization_date) {
      setToast({
        mode: "error",
        message: "Una deducción autorizada necesita su fecha de autorización",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await hrDeductionsApi.create({
        employee_id: employeeId,
        kind: form.kind as
          | "deuda_patrono"
          | "sindical"
          | "alimentaria"
          | "otra",
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
        authorization_ref: form.authorized
          ? form.authorization_ref || undefined
          : undefined,
        start_date: form.start_date,
      });
      setForm(emptyForm());
      await reload(employeeId);
      setToast({
        mode: "success",
        message: "Deducción registrada correctamente",
      });
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
      setToast({
        mode: "error",
        message: "Ingresa un monto válido para aplicar",
      });
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
        message:
          error instanceof Error ? error.message : "Error aplicando el pago",
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
          error instanceof Error
            ? error.message
            : "Error desactivando la deducción",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "kind",
      label: "Tipo",
      width: "16%",
      render: (value: string) => KIND_LABEL[value] ?? value,
    },
    { key: "description", label: "Descripción", width: "22%" },
    {
      key: "outstanding_balance",
      label: "Saldo pendiente",
      width: "14%",
      render: (value: number | string) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    {
      key: "authorized",
      label: "Autorización",
      width: "16%",
      render: (value: boolean, row: HrEmployeeDeduction) =>
        value ? (
          <div className="text-xs">
            <Badge variant="green">Autorizada</Badge>
            <p className="mt-1 text-gray-500">
              {row.authorization_date?.slice(0, 10) ?? "sin fecha"}
              {row.authorization_ref ? ` · ${row.authorization_ref}` : ""}
            </p>
          </div>
        ) : (
          <Badge variant="gray">No</Badge>
        ),
    },
    {
      key: "is_active",
      label: "Estado",
      width: "10%",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "gray"}>
          {value ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "22%",
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
    <>
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {margin && (
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <StatCard
            label="Margen disponible este periodo (Art. 154)"
            value={formatAmount(margin)}
            sublabel="Tope de 1/3 del salario, sin contar pensión alimentaria"
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
            onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}
            options={KIND_OPTIONS}
          />
          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            required
          />
          <Input
            label="Monto total"
            type="number"
            step="0.01"
            value={form.total_amount}
            onChange={(e) =>
              setForm((p) => ({ ...p, total_amount: e.target.value }))
            }
            required
          />
          <Input
            label="Cuota periódica"
            type="number"
            step="0.01"
            value={form.installment_amount}
            onChange={(e) =>
              setForm((p) => ({ ...p, installment_amount: e.target.value }))
            }
          />
          <Input
            label="Fecha de inicio"
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm((p) => ({ ...p, start_date: e.target.value }))
            }
            required
          />
          {form.kind === "sindical" && (
            <Input
              label="Organización sindical"
              value={form.union_organization}
              onChange={(e) =>
                setForm((p) => ({ ...p, union_organization: e.target.value }))
              }
              required
            />
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">
              Autorización del trabajador
            </span>
            <span className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-accent-white px-4 py-2.5">
              <input
                type="checkbox"
                checked={form.authorized}
                onChange={(e) =>
                  setForm((p) => ({ ...p, authorized: e.target.checked }))
                }
                className="h-4 w-4 shrink-0 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                {form.authorized
                  ? "Autorizada por el trabajador"
                  : requiresAuthorization
                    ? "Sin autorizar (la cuota sindical la exige, Art. 413)"
                    : "Sin autorización expresa"}
              </span>
            </span>
          </label>

          {form.authorized && (
            <>
              <Input
                label="Fecha de autorización"
                type="date"
                value={form.authorization_date}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    authorization_date: e.target.value,
                  }))
                }
                required
              />
              <Input
                label="Referencia de autorización"
                placeholder="Ej: Carta de afiliación 2026-0087"
                value={form.authorization_ref}
                onChange={(e) =>
                  setForm((p) => ({ ...p, authorization_ref: e.target.value }))
                }
                hint="Documento que respalda el descuento, para auditoría."
              />
            </>
          )}
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Tope del Art. 154: las deudas con el patrono no pueden pasar de 1/3
          del periodo, contando lo ya aplicado. La pensión alimentaria es la
          unica excepcion (Art. 152).
        </p>
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
  );
}
