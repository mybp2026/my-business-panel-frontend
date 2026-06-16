import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { fnzExpenseApi } from "@/api/fnzExpense.api";
import type { ExpenseCategory } from "@/interfaces/entities/FnzExpense.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

interface Props {
  tenantId: string;
  initialCategories: ExpenseCategory[];
}

export function CategoryManagementPanel({ tenantId, initialCategories }: Props) {
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    account_code: "",
    is_fixed: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.account_code.trim()) return;
    setSubmitting(true);
    try {
      const categoryId = await fnzExpenseApi.createCategory({
        tenant_id: tenantId,
        name: form.name.trim(),
        account_code: form.account_code.trim(),
        is_fixed: form.is_fixed,
      });
      const newCategory: ExpenseCategory = {
        category_id: categoryId,
        tenant_id: tenantId,
        name: form.name.trim(),
        account_code: form.account_code.trim(),
        parent_category_id: null,
        is_fixed: form.is_fixed,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCategory]);
      setForm({ name: "", account_code: "", is_fixed: false });
      setShowForm(false);
      setToast({ mode: "success", message: "Categoría creada" });
    } catch (err) {
      setToast({
        mode: "error",
        message: err instanceof Error ? err.message : "Error al crear categoría",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {categories.filter((c) => c.is_active).length} categorías activas
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancelar" : "+ Nueva"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex flex-col gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Servicios públicos"
            required
          />
          <Input
            label="Código contable"
            value={form.account_code}
            onChange={(e) => setForm((f) => ({ ...f, account_code: e.target.value }))}
            placeholder="Ej: 6-1-003"
            required
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_fixed}
              onChange={(e) => setForm((f) => ({ ...f, is_fixed: e.target.checked }))}
              className="rounded"
            />
            Gasto fijo
          </label>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            fullWidth
            loading={submitting}
          >
            Guardar categoría
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {categories.filter((c) => c.is_active).length === 0 ? (
          <p className="text-sm text-gray-400">Sin categorías registradas</p>
        ) : (
          categories
            .filter((c) => c.is_active)
            .map((c) => (
              <div
                key={c.category_id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    {c.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {c.account_code}
                  </span>
                </div>
                <Badge variant={c.is_fixed ? "red" : "yellow"}>
                  {c.is_fixed ? "Fijo" : "Variable"}
                </Badge>
              </div>
            ))
        )}
      </div>
    </>
  );
}
