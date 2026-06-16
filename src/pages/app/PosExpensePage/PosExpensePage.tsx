import { useEffect, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import { posExpenseApi } from "@/api/posExpense.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  Expense,
  ExpenseType,
} from "@/interfaces/entities/PosExpense.interface";
import type { PosExpensePageLoaderData } from "@/router/loaders/posExpense.loaders";

export function PosExpensePage() {
  const {
    branches,
    expenseTypes: initialTypes,
    variableCategories,
    tenantId,
  } = useLoaderData() as PosExpensePageLoaderData;
  const { user } = useAuth();
  const canCreateType = (user?.role.role_id ?? 4) < 4;

  const [selectedBranchId, setSelectedBranchId] = useState(
    branches[0]?.branch_id ?? "",
  );
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(initialTypes);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  // Create expense form
  const [form, setForm] = useState({ expense_type_id: "", expense_amount: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create type form
  const [typeForm, setTypeForm] = useState({
    expense_type_name: "",
    expense_type_detail: "",
  });
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);

  // Status actions state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBranchId) return;
    let cancelled = false;
    setIsLoading(true);
    posExpenseApi
      .listByBranch(selectedBranchId)
      .then((data) => {
        if (!cancelled) setExpenses(data);
      })
      .catch((err) =>
        setToast({
          mode: "error",
          message:
            err instanceof Error ? err.message : "Error al cargar gastos",
        }),
      )
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBranchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expense_type_id || form.expense_amount <= 0) return;
    setIsSubmitting(true);
    try {
      const created = await posExpenseApi.create({
        expense_type_id: form.expense_type_id,
        expense_amount: form.expense_amount,
        branch_id: selectedBranchId,
      });
      setExpenses((prev) => [created, ...prev]);
      setForm({ expense_type_id: "", expense_amount: 0 });
      setToast({ mode: "success", message: "Gasto registrado exitosamente" });
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar gasto",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.expense_type_name.trim()) return;
    setIsCreatingType(true);
    try {
      const created = await posExpenseApi.createType({
        tenant_id: tenantId,
        expense_type_name: typeForm.expense_type_name.trim(),
        expense_type_detail: typeForm.expense_type_detail.trim() || undefined,
      });
      setExpenseTypes((prev) => [...prev, created]);
      setTypeForm({ expense_type_name: "", expense_type_detail: "" });
      setShowTypeForm(false);
      setToast({ mode: "success", message: "Tipo de gasto creado" });
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error ? err.message : "Error al crear tipo de gasto",
      });
    } finally {
      setIsCreatingType(false);
    }
  };

  const handleUpdateStatus = async (
    expenseId: string,
    status: "approved" | "rejected" | "cancelled",
    rejectionReason?: string,
  ) => {
    setIsUpdatingStatus(expenseId);
    try {
      const updated = await posExpenseApi.updateStatus(
        expenseId,
        status,
        rejectionReason,
      );
      setExpenses((prev) =>
        prev.map((e) => (e.expense_id === expenseId ? updated : e)),
      );
      setToast({
        mode: "success",
        message:
          status === "approved"
            ? "Gasto aprobado"
            : status === "rejected"
              ? "Gasto rechazado"
              : "Solicitud cancelada",
      });
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error ? err.message : "Error al actualizar estado",
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Combinar tipos POS con categorías variables del catálogo contable
  const typeOptions = [
    ...expenseTypes.map((t) => ({
      value: t.expense_type_id,
      label: t.expense_type_name,
    })),
    ...variableCategories.map((c) => ({
      value: `cat:${c.category_id}`,
      label: `${c.name} (Finanzas)`,
    })),
  ];

  const branchOptions = branches.map((b) => ({
    value: b.branch_id,
    label: b.branch_name,
  }));

  const isAdmin = (user?.role.role_id ?? 4) < 4;
  const isEmployee = user?.role.role_id === 4;

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gastos</h1>
        <p className="text-gray-600">
          Registra y consulta gastos operativos por sucursal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: filters + form */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-300 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Sucursal
            </h2>
            <Select
              label="Sucursal"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              options={branchOptions}
              required
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-300 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Registrar gasto
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Select
                label="Tipo de gasto"
                value={form.expense_type_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expense_type_id: e.target.value }))
                }
                options={typeOptions}
                placeholder="Seleccionar tipo"
                required
              />
              <Input
                label="Monto"
                type="number"
                min={0.01}
                step="0.01"
                placeholder="0.00"
                value={form.expense_amount || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expense_amount: parseFloat(e.target.value) || 0,
                  }))
                }
                required
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isSubmitting}
                disabled={
                  !selectedBranchId ||
                  isSubmitting ||
                  form.expense_amount <= 0 ||
                  form.expense_type_id === ""
                }
              >
                {isEmployee ? "Solicitar gasto" : "Registrar gasto"}
              </Button>
            </form>
          </div>

          {canCreateType && (
            <div className="bg-white rounded-2xl border border-gray-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">
                  Tipos de gasto
                </h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowTypeForm((v) => !v)}
                >
                  {showTypeForm ? "Cancelar" : "+ Nuevo tipo"}
                </Button>
              </div>
              {showTypeForm && (
                <form
                  onSubmit={handleCreateType}
                  className="flex flex-col gap-3 mb-4"
                >
                  <Input
                    label="Nombre"
                    value={typeForm.expense_type_name}
                    onChange={(e) =>
                      setTypeForm((f) => ({
                        ...f,
                        expense_type_name: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="Detalle (opcional)"
                    value={typeForm.expense_type_detail}
                    onChange={(e) =>
                      setTypeForm((f) => ({
                        ...f,
                        expense_type_detail: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isCreatingType}
                    fullWidth
                  >
                    Guardar tipo
                  </Button>
                </form>
              )}
              <div className="flex flex-col gap-1">
                {expenseTypes.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin tipos registrados</p>
                ) : (
                  expenseTypes.map((t) => (
                    <div
                      key={t.expense_type_id}
                      className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="font-medium">{t.expense_type_name}</span>
                      {t.expense_type_detail && (
                        <span className="text-gray-400 ml-2 text-xs">
                          {t.expense_type_detail}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: table */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-300 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Registro de gastos
            </h2>
            <Table
              isLoading={isLoading}
              columns={[
                {
                  key: "expense_type_name",
                  label: "Tipo",
                  width: "20%",
                },
                {
                  key: "user_email",
                  label: "Usuario",
                  width: "20%",
                  render: (value: unknown) => (
                    <span
                      className="text-xs text-gray-500 truncate block max-w-[120px]"
                      title={value as string}
                    >
                      {value as string}
                    </span>
                  ),
                },
                {
                  key: "expense_amount",
                  label: "Monto",
                  width: "15%",
                  render: (value: unknown) => (
                    <span className="font-mono font-semibold text-red-700">
                      ₡{" "}
                      {Number(value).toLocaleString("es-CR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Estado",
                  width: "15%",
                  render: (value: unknown, row: Expense) => {
                    const status = value as string;
                    let variant:
                      | "success"
                      | "warning"
                      | "danger"
                      | "secondary" = "secondary";
                    let label = status;

                    if (status === "approved") {
                      variant = "success";
                      label = "Aprobado";
                    } else if (status === "pending") {
                      variant = "warning";
                      label = "Pendiente";
                    } else if (status === "rejected") {
                      variant = "danger";
                      label = "Rechazado";
                    } else if (status === "cancelled") {
                      variant = "secondary";
                      label = "Cancelado";
                    }

                    return (
                      <div className="flex flex-col gap-1">
                        <Badge variant={variant as any}>{label}</Badge>
                        {row.rejection_reason && (
                          <span className="text-[10px] text-red-500 italic leading-tight">
                            {row.rejection_reason}
                          </span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "created_at",
                  label: "Fecha",
                  width: "20%",
                  render: (value: unknown) =>
                    new Date(value as string).toLocaleString("es-CR"),
                },
                {
                  key: "actions",
                  label: "Acciones",
                  width: "25%",
                  render: (_: unknown, row: Expense) => {
                    if (row.status !== "pending") return null;

                    return (
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              size="xs"
                              variant="primary"
                              loading={isUpdatingStatus === row.expense_id}
                              onClick={() =>
                                handleUpdateStatus(row.expense_id, "approved")
                              }
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="xs"
                              variant="danger"
                              loading={isUpdatingStatus === row.expense_id}
                              onClick={() => {
                                const reason = prompt(
                                  "Motivo del rechazo (opcional):",
                                );
                                if (reason !== null) {
                                  handleUpdateStatus(
                                    row.expense_id,
                                    "rejected",
                                    reason,
                                  );
                                }
                              }}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                        {isEmployee && row.user_id === user?.user_id && (
                          <Button
                            size="xs"
                            variant="secondary"
                            loading={isUpdatingStatus === row.expense_id}
                            onClick={() => {
                              if (
                                confirm(
                                  "¿Estás seguro de cancelar esta solicitud?",
                                )
                              ) {
                                handleUpdateStatus(row.expense_id, "cancelled");
                              }
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={expenses}
              emptyMessage={
                selectedBranchId
                  ? "No hay gastos registrados para esta sucursal"
                  : "Selecciona una sucursal"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
