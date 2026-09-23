import { useState } from "react";

import { creditDebitNoteApi } from "@/api";
import { getInvoiceForSale } from "@/router/actions/sale.actions";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import { IconPlus } from "@/assets/icons";

import { CreditDebitNotesSection } from "./CreditDebitNotesSection";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { CreditDebitNoteListItem } from "@/interfaces/entities/CreditDebitNote.interface";

interface CreditDebitNotesListSectionProps {
  initialNotes: CreditDebitNoteListItem[];
}

const formatCurrency = (value: number | string, symbol = "Bs.") =>
  `${symbol} ${Number(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
  })}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleString("es-VE", {
    dateStyle: "short",
    timeStyle: "short",
  });

const REASON_LABELS: Record<string, string> = {
  devolucion: "Devolución",
  descuento: "Descuento",
  error: "Error de facturación",
  mercancia_danada: "Mercancía dañada",
  mora: "Mora",
  cargo_adicional: "Cargo adicional",
  otro: "Otro",
};

/**
 * Notas de credito/debito, integradas debajo del historial de ventas
 * (MBP_Cambios_CR_a_Venezuela.md, seccion POS). Complementa
 * CreditDebitNotesSection (que vive en el detalle de una venta puntual)
 * dando un punto de entrada propio: buscar por sale_id sin abrir el detalle.
 */
export function CreditDebitNotesListSection({
  initialNotes,
}: CreditDebitNotesListSectionProps) {
  const [notes, setNotes] = useState<CreditDebitNoteListItem[]>(initialNotes);
  const [isReloading, setIsReloading] = useState(false);
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saleIdInput, setSaleIdInput] = useState("");
  const [isResolvingInvoice, setIsResolvingInvoice] = useState(false);
  const [resolvedInvoiceId, setResolvedInvoiceId] = useState<string | null>(
    null,
  );
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const reload = async () => {
    setIsReloading(true);
    try {
      setNotes(await creditDebitNoteApi.listByTenant());
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error al cargar las notas",
      });
    } finally {
      setIsReloading(false);
    }
  };

  const openCreate = () => {
    setSaleIdInput("");
    setResolvedInvoiceId(null);
    setResolveError(null);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setResolvedInvoiceId(null);
    setResolveError(null);
  };

  const handleResolveSale = async () => {
    const saleId = saleIdInput.trim();
    if (!saleId) {
      setResolveError("Ingrese el ID de la venta");
      return;
    }
    setIsResolvingInvoice(true);
    setResolveError(null);
    try {
      const invoice = await getInvoiceForSale(saleId);
      if (!invoice) {
        setResolveError(
          "Esta venta no tiene factura asociada (aún no se completó o no existe).",
        );
        return;
      }
      setResolvedInvoiceId(invoice.invoice_id);
    } catch {
      setResolveError("No se pudo encontrar la venta. Verifique el ID.");
    } finally {
      setIsResolvingInvoice(false);
    }
  };

  const query = search.trim().toLowerCase();
  const filteredNotes = notes.filter((note) => {
    if (!query) return true;
    return (
      (note.customer_name ?? "").toLowerCase().includes(query) ||
      note.sale_id.toLowerCase().includes(query) ||
      String(note.note_number).includes(query)
    );
  });

  return (
    <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            Notas de crédito y débito
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Ajustes registrados sobre facturas ya emitidas. Cada nota tiene su
            propia numeración y nunca modifica la factura original.
          </p>
        </div>
        <Button onClick={openCreate}>
          <IconPlus />
          Nueva nota
        </Button>
      </div>

      <Input
        label="Buscar"
        placeholder="Buscar por cliente, venta o número de nota"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mb-4 w-full lg:max-w-md"
      />

      <Table
        isLoading={isReloading}
        columns={[
          {
            key: "note_number",
            label: "Nota",
            width: "8%",
            render: (value) => (
              <span className="font-mono text-xs text-gray-500">
                #{String(value)}
              </span>
            ),
          },
          {
            key: "note_type",
            label: "Tipo",
            width: "10%",
            render: (value) => (
              <Badge variant={value === "credit" ? "green" : "yellow"}>
                {value === "credit" ? "Crédito" : "Débito"}
              </Badge>
            ),
          },
          {
            key: "reason_kind",
            label: "Motivo",
            width: "15%",
            render: (value) => REASON_LABELS[String(value)] ?? String(value),
          },
          {
            key: "customer_name",
            label: "Cliente",
            width: "17%",
            render: (value) => (value as string | null) ?? "—",
          },
          {
            key: "sale_id",
            label: "Venta",
            width: "13%",
            render: (value) => (
              <span className="font-mono text-xs text-gray-500">
                {String(value).slice(0, 8)}…
              </span>
            ),
          },
          {
            key: "amount",
            label: "Monto",
            width: "12%",
            render: (value, row) => {
              const note = row as CreditDebitNoteListItem;
              return (
                <span
                  className={
                    note.note_type === "credit"
                      ? "font-semibold text-emerald-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {note.note_type === "credit" ? "-" : "+"}
                  {formatCurrency(value as number | string)}
                </span>
              );
            },
          },
          {
            key: "is_voided",
            label: "Estado",
            width: "10%",
            render: (value) =>
              value ? (
                <Badge variant="secondary">Anulada</Badge>
              ) : (
                <Badge variant="green">Activa</Badge>
              ),
          },
          {
            key: "created_at",
            label: "Fecha",
            width: "15%",
            render: (value) => formatDate(String(value)),
          },
        ]}
        data={filteredNotes}
        emptyMessage="No hay notas de crédito o débito registradas"
      />

      <Modal isOpen={isCreateOpen} onClose={closeCreate} title="Nueva nota">
        {!resolvedInvoiceId ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ingrese el ID de la venta cuya factura desea ajustar. Puede
              copiarlo desde la tabla de historial de ventas.
            </p>
            <Input
              label="ID de la venta"
              value={saleIdInput}
              onChange={(event) => setSaleIdInput(event.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            {resolveError && (
              <p className="text-xs text-red-500">{resolveError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeCreate}>
                Cancelar
              </Button>
              <Button
                onClick={handleResolveSale}
                loading={isResolvingInvoice}
              >
                Buscar factura
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <CreditDebitNotesSection
              invoiceId={resolvedInvoiceId}
              currencySymbol="Bs."
            />
            <div className="mt-4 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  closeCreate();
                  reload();
                }}
              >
                Listo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
