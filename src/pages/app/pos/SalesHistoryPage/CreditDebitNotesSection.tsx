import { useEffect, useState } from "react";

import { creditDebitNoteApi } from "@/api";
import { purchaseApi } from "@/api/purchase.api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";

import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";

import { IconPlus } from "@/assets/icons";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  CreditDebitNote,
  CreditDebitNoteReasonKind,
  CreditDebitNoteType,
} from "@/interfaces/entities/CreditDebitNote.interface";
import type { Supplier } from "@/interfaces/entities/Purchase.interface";

interface CreditDebitNotesSectionProps {
  invoiceId: string;
  currencySymbol: string;
}

const REASON_OPTIONS: { value: CreditDebitNoteReasonKind; label: string }[] = [
  { value: "devolucion", label: "Devolución" },
  { value: "descuento", label: "Descuento" },
  { value: "error", label: "Error de facturación" },
  { value: "mercancia_danada", label: "Mercancía dañada" },
  { value: "mora", label: "Mora" },
  { value: "cargo_adicional", label: "Cargo adicional" },
  { value: "otro", label: "Otro" },
];

/**
 * Notas de credito/debito sobre una factura de venta (MBP_Cambios_CR_a_Venezuela.md,
 * seccion POS). La factura no se edita ni anula -- esto es un registro de
 * ajuste aparte, con su propia numeracion, que se refleja en el saldo del
 * cliente si la venta es a credito/apartado.
 */
export function CreditDebitNotesSection({
  invoiceId,
  currencySymbol,
}: CreditDebitNotesSectionProps) {
  const rate = useCurrentExchangeRate();
  const [notes, setNotes] = useState<CreditDebitNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const [form, setForm] = useState({
    note_type: "credit" as CreditDebitNoteType,
    reason_kind: "devolucion" as CreditDebitNoteReasonKind,
    amount: "",
    description: "",
    supplier_id: "",
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const requiresSupplier =
    form.reason_kind === "mercancia_danada" && form.note_type === "credit";

  useEffect(() => {
    if (!requiresSupplier || suppliers.length > 0) return;
    purchaseApi.listSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresSupplier]);

  const reload = async () => {
    setIsLoading(true);
    try {
      setNotes(await creditDebitNoteApi.listByInvoice(invoiceId));
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error cargando notas",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const handleCreate = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setToast({ mode: "error", message: "Ingresa un monto válido" });
      return;
    }
    if (requiresSupplier && !form.supplier_id) {
      setToast({
        mode: "error",
        message: "Selecciona el proveedor a acreditar por la mercancía dañada",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await creditDebitNoteApi.create({
        invoice_id: invoiceId,
        note_type: form.note_type,
        reason_kind: form.reason_kind,
        amount,
        description: form.description.trim() || undefined,
        supplier_id: requiresSupplier ? form.supplier_id : undefined,
      });
      setForm({
        note_type: "credit",
        reason_kind: "devolucion",
        amount: "",
        description: "",
        supplier_id: "",
      });
      setShowForm(false);
      await reload();
      setToast({ mode: "success", message: "Nota registrada correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error registrando la nota",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async (note: CreditDebitNote) => {
    if (!confirm(`¿Anular la nota #${note.note_number}?`)) return;
    try {
      await creditDebitNoteApi.voidNote(note.note_id, "Anulada desde el detalle de venta");
      await reload();
      setToast({ mode: "success", message: "Nota anulada" });
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error anulando la nota",
      });
    }
  };

  const reasonLabel = (kind: CreditDebitNoteReasonKind) =>
    REASON_OPTIONS.find((r) => r.value === kind)?.label ?? kind;

  return (
    <div>
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Notas de crédito / débito
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <IconPlus />
          Nueva nota
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Tipo"
              value={form.note_type}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  note_type: e.target.value as CreditDebitNoteType,
                }))
              }
              options={[
                { value: "credit", label: "Nota de crédito (reduce lo facturado)" },
                { value: "debit", label: "Nota de débito (aumenta lo facturado)" },
              ]}
            />
            <Select
              label="Motivo"
              value={form.reason_kind}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  reason_kind: e.target.value as CreditDebitNoteReasonKind,
                }))
              }
              options={REASON_OPTIONS}
            />
            <Input
              label={`Monto (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              required
            />
            <Input
              label="Descripción"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              hint="Ej: 1 unidad dañada en transporte"
            />
            {requiresSupplier && (
              <Select
                label="Proveedor a acreditar"
                value={form.supplier_id}
                onChange={(e) =>
                  setForm((p) => ({ ...p, supplier_id: e.target.value }))
                }
                options={suppliers.map((s) => ({
                  value: s.supplier_id,
                  label: s.supplier_name,
                }))}
                placeholder="Selecciona un proveedor"
                hint="El monto queda disponible como crédito en Compras para la próxima orden a este proveedor"
                required
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={isSubmitting}>
              Registrar nota
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400">
          No hay notas de crédito o débito sobre esta factura.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.note_id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${
                note.is_voided
                  ? "border-gray-200 bg-gray-50 opacity-60"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">
                    #{note.note_number}
                  </span>
                  <Badge variant={note.note_type === "credit" ? "green" : "yellow"}>
                    {note.note_type === "credit" ? "Crédito" : "Débito"}
                  </Badge>
                  {note.is_voided && <Badge variant="secondary">Anulada</Badge>}
                </div>
                <p className="mt-1 text-gray-700">
                  {reasonLabel(note.reason_kind)}
                  {note.description ? ` — ${note.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <DualCurrencyAmount
                  amountBs={
                    (note.note_type === "credit" ? -1 : 1) * Number(note.amount)
                  }
                  rate={rate}
                  amountClassName={`font-semibold ${
                    note.note_type === "credit"
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                />
                {!note.is_voided && (
                  <Button size="sm" variant="ghost" onClick={() => handleVoid(note)}>
                    Anular
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
