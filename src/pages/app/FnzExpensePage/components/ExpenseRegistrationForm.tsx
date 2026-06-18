import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ExpenseCategoryComboBox } from "@/components/ui/ExpenseCategoryComboBox";
import { financesApi } from "@/api/finances.api";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExpenseCategory } from "@/interfaces/entities/FnzExpense.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

interface Props {
  tenantId: string;
  branches: Branch[];
  categories: ExpenseCategory[];
  currencies: Currency[];
  userId?: string;
  onSuccess: () => void;
}

export function ExpenseRegistrationForm({
  tenantId,
  branches,
  categories: _categories,
  currencies,
  userId,
  onSuccess,
}: Props) {
  const crcCurrency =
    currencies.find((c) => c.currency_code === "CRC") ?? currencies[0];

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
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const branchOptions = branches.map((b) => ({
    value: b.branch_id,
    label: b.branch_name,
  }));

  const paymentOptions = [
    { value: "CASH", label: "Efectivo" },
    { value: "BANK", label: "Transferencia bancaria" },
    { value: "CREDIT_CARD", label: "Tarjeta de crédito" },
    { value: "CHECK", label: "Cheque" },
    { value: "TRANSFER", label: "Transferencia" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id || !form.branch_id || !form.amount) return;

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
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
        created_by: userId,
      });
      setToast({ mode: "success", message: "Gasto registrado correctamente" });
      setForm((f) => ({ ...f, amount: "", description: "", category_id: "", category_name: "" }));
      onSuccess();
    } catch (err) {
      setToast({
        mode: "error",
        message: err instanceof Error ? err.message : "Error al registrar gasto",
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
          onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
          options={branchOptions}
          required
        />
        <Input
          label="Descripción (opcional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Detalle del gasto"
        />
        <Input
          label={`Monto (${crcCurrency?.symbol ?? "₡"})`}
          type="number"
          min={0.01}
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          placeholder="0.00"
          required
        />
        <Select
          label="Método de pago"
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
          onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
          required
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={submitting}
          disabled={
            submitting ||
            !form.category_id ||
            !form.branch_id ||
            !form.amount
          }
        >
          Registrar gasto
        </Button>
      </form>
    </>
  );
}
