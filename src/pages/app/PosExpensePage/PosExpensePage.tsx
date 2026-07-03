import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import { financesApi } from "@/api/finances.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { ExpenseCategoryComboBox } from "@/components/ui/ExpenseCategoryComboBox";
import { ExpenseHistoryTable } from "@/components/finances/ExpenseHistoryTable";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { ExpenseCategory } from "@/interfaces/entities/FnzExpense.interface";
import type { PosExpensePageLoaderData } from "@/router/loaders/posExpense.loaders";

export function PosExpensePage() {
  const {
    branches,
    categories: initialCategories,
    currencies,
    tenantId,
  } = useLoaderData() as PosExpensePageLoaderData;
  const { user } = useAuth();
  const canManageCategories = (user?.role.role_id ?? 4) < 4;
  const crcCurrency =
    currencies.find((c) => c.currency_code === "CRC") ?? currencies[0];

  const [categories, setCategories] =
    useState<ExpenseCategory[]>(initialCategories);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  // Create expense form
  const [form, setForm] = useState({
    category_id: "",
    category_name: "",
    branch_id: branches[0]?.branch_id ?? "",
    description: "",
    amount: "",
    payment_method: "CASH" as
      | "CASH"
      | "BANK"
      | "CREDIT_CARD"
      | "CHECK"
      | "TRANSFER",
    expense_date: new Date().toISOString().split("T")[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create category form
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    is_fixed: false,
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.category_id || !form.branch_id || isNaN(amount) || amount <= 0)
      return;
    setIsSubmitting(true);
    try {
      await financesApi.createExpense({
        tenant_id: tenantId,
        branch_id: form.branch_id,
        category_id: form.category_id,
        description: form.description || undefined,
        amount,
        tax_amount: 0,
        total_amount: amount,
        currency_id: crcCurrency?.currency_id ?? 1,
        expense_date: form.expense_date,
        payment_method: form.payment_method,
        created_by: user?.user_id,
      });
      setForm((f) => ({
        ...f,
        amount: "",
        description: "",
        category_id: "",
        category_name: "",
      }));
      setHistoryRefresh((n) => n + 1);
      setToast({ mode: "success", message: "Gasto registrado correctamente" });
    } catch (err) {
      setToast({
        mode: "error",
        message: err instanceof Error ? err.message : "Error al registrar gasto",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    setIsCreatingCategory(true);
    try {
      const categoryId = await financesApi.createCategory({
        tenant_id: tenantId,
        name: categoryForm.name.trim(),
        is_fixed: categoryForm.is_fixed,
      });
      const newCategory: ExpenseCategory = {
        category_id: categoryId,
        tenant_id: tenantId,
        name: categoryForm.name.trim(),
        account_code: null,
        parent_category_id: null,
        is_fixed: categoryForm.is_fixed,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCategory]);
      setCategoryForm({ name: "", is_fixed: false });
      setShowCategoryForm(false);
      setToast({ mode: "success", message: "Categoria creada" });
    } catch (err) {
      setToast({
        mode: "error",
        message: err instanceof Error ? err.message : "Error al crear categoria",
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const branchOptions = branches.map((b) => ({
    value: b.branch_id,
    label: b.branch_name,
  }));

  const paymentOptions = [
    { value: "CASH", label: "Efectivo" },
    { value: "BANK", label: "Transferencia bancaria" },
    { value: "CREDIT_CARD", label: "Tarjeta de credito" },
    { value: "CHECK", label: "Cheque" },
    { value: "TRANSFER", label: "Transferencia" },
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gastos</h1>
        <p className="text-gray-600">
          Registra y consulta gastos operativos por sucursal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-300 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Registrar gasto
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <ExpenseCategoryComboBox
                tenantId={tenantId}
                label="Categoria"
                value={form.category_id}
                displayValue={form.category_name}
                onChange={(id, name) =>
                  setForm((f) => ({ ...f, category_id: id, category_name: name }))
                }
                required
              />
              <Select
                label="Sucursal"
                value={form.branch_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, branch_id: e.target.value }))
                }
                options={branchOptions}
                required
              />
              <Input
                label="Descripcion (opcional)"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Detalle del gasto"
              />
              <Input
                label={`Monto (${crcCurrency?.symbol ?? "₡"})`}
                type="number"
                min={0.01}
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                required
              />
              <Select
                label="Metodo de pago"
                value={form.payment_method}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    payment_method: e.target.value as typeof form.payment_method,
                  }))
                }
                options={paymentOptions}
                required
              />
              <Input
                label="Fecha"
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expense_date: e.target.value }))
                }
                required
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isSubmitting}
                disabled={
                  isSubmitting ||
                  !form.category_id ||
                  !form.branch_id ||
                  !form.amount
                }
              >
                Registrar gasto
              </Button>
            </form>
          </div>

          {canManageCategories && (
            <div className="bg-white rounded-2xl border border-gray-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">
                  Categorias de gasto
                </h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCategoryForm((v) => !v)}
                >
                  {showCategoryForm ? "Cancelar" : "+ Nueva"}
                </Button>
              </div>
              {showCategoryForm && (
                <form
                  onSubmit={handleCreateCategory}
                  className="flex flex-col gap-2 mb-4 p-3 bg-gray-50 rounded-xl"
                >
                  <Input
                    label="Nombre"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Ej: Servicios publicos"
                    required
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_fixed}
                      onChange={(e) =>
                        setCategoryForm((f) => ({
                          ...f,
                          is_fixed: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    Gasto fijo
                  </label>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    fullWidth
                    loading={isCreatingCategory}
                  >
                    Guardar categoria
                  </Button>
                </form>
              )}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Sin categorias registradas
                  </p>
                ) : (
                  categories.map((c) => (
                    <div
                      key={c.category_id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-800">
                          {c.name}
                        </span>
                        {c.account_code && (
                          <span className="text-xs text-gray-400 ml-2">
                            {c.account_code}
                          </span>
                        )}
                      </div>
                      <Badge variant={c.is_fixed ? "red" : "yellow"}>
                        {c.is_fixed ? "Fijo" : "Variable"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: history */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-300 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Registro de gastos
            </h2>
            <ExpenseHistoryTable
              branches={branches}
              currencies={currencies}
              refreshSignal={historyRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
