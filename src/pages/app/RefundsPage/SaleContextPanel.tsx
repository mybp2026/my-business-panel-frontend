import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";
import { IconTrash } from "@/assets/icons";

import { paymentMethods, refundStatuses } from "@/constants/payment-methods";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";

import type { SaleRefundContext } from "@/interfaces/entities/SaleRefundContext.interface";

import { DetailBox } from "./DetailBox";
import { RefundItemsTable } from "./RefundItemsTable";
import { formatDate } from "./refunds.utils";
import type { ItemSelection, RefundMode } from "@/hooks/useRefundFlow";

interface SaleContextPanelProps {
  context: SaleRefundContext;
  mode: RefundMode;
  currencySymbol: string;
  selections: Record<string, ItemSelection>;
  onToggleItem: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number, available: number) => void;
  refundMethod: number;
  onRefundMethodChange: (value: number) => void;
  returnStatusId: number;
  onReturnStatusChange: (value: number) => void;
  refundTotal: number;
  description: string;
  onDescriptionChange: (value: string) => void;
  isSubmitting: boolean;
  canSubmitPartial: boolean;
  onSubmitPartial: () => void;
  onSubmitFull: () => void;
}

export function SaleContextPanel({
  context,
  mode,
  currencySymbol,
  selections,
  onToggleItem,
  onUpdateQuantity,
  refundMethod,
  onRefundMethodChange,
  returnStatusId,
  onReturnStatusChange,
  refundTotal,
  description,
  onDescriptionChange,
  isSubmitting,
  canSubmitPartial,
  onSubmitPartial,
  onSubmitFull,
}: SaleContextPanelProps) {
  const customerName = context.customer
    ? `${context.customer.first_name ?? ""} ${context.customer.last_name ?? ""}`.trim() ||
      "—"
    : "—";
  const rate = useCurrentExchangeRate();

  return (
    <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DetailBox label="Venta" mono value={context.sale.sale_id} />
        <DetailBox label="Sucursal" value={context.sale.branch_name ?? "—"} />
        <DetailBox
          label="Fecha de venta"
          value={formatDate(context.sale.sale_date)}
        />
        <DetailBox
          label="Cliente"
          value={customerName}
          hint={context.customer?.document_number ?? undefined}
        />
        <DetailBox
          label="Total venta"
          value={<DualCurrencyAmount amountBs={context.sale.total_amount} rate={rate} />}
        />
        <DetailBox
          label="Estado"
          value={
            <div className="flex gap-2">
              <Badge variant={context.sale.is_completed ? "green" : "yellow"}>
                {context.sale.is_completed ? "Completada" : "Pendiente"}
              </Badge>
            </div>
          }
        />
      </div>

      {context.invoice && (
        <InvoiceSection
          title="Factura"
          rows={[
            {
              label: "ID",
              mono: true,
              value: context.invoice.invoice_id,
            },
            {
              label: "Emitida",
              value: formatDate(context.invoice.invoiced_at),
            },
            {
              label: "Total",
              value: <DualCurrencyAmount amountBs={context.invoice.total_amount} rate={rate} />,
            },
          ]}
        />
      )}

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Productos en la factura
        </h3>
        {context.items.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay productos asociados a esta venta.
          </p>
        ) : mode === "partial" ? (
          <RefundItemsTable
            mode="partial"
            items={context.items}
            selections={selections}
            onToggle={onToggleItem}
            onQtyChange={onUpdateQuantity}
            currencySymbol={currencySymbol}
          />
        ) : (
          <RefundItemsTable
            mode="full"
            items={context.items}
            currencySymbol={currencySymbol}
          />
        )}
      </div>

      {mode === "partial" ? (
        <PartialRefundActions
          refundMethod={refundMethod}
          onRefundMethodChange={onRefundMethodChange}
          returnStatusId={returnStatusId}
          onReturnStatusChange={onReturnStatusChange}
          refundTotal={refundTotal}
          currencySymbol={currencySymbol}
          description={description}
          onDescriptionChange={onDescriptionChange}
          isSubmitting={isSubmitting}
          canSubmit={canSubmitPartial}
          onSubmit={onSubmitPartial}
        />
      ) : (
        <FullRefundActions
          isSubmitting={isSubmitting}
          description={description}
          onDescriptionChange={onDescriptionChange}
          onSubmit={onSubmitFull}
        />
      )}
    </div>
  );
}

interface InvoiceRow {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

function InvoiceSection({
  title,
  rows,
}: {
  title: string;
  rows: InvoiceRow[];
}) {
  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {rows.map((row) => (
          <DetailBox
            key={row.label}
            label={row.label}
            value={row.value}
            mono={row.mono}
          />
        ))}
      </div>
    </div>
  );
}

interface PartialRefundActionsProps {
  refundMethod: number;
  onRefundMethodChange: (value: number) => void;
  returnStatusId: number;
  onReturnStatusChange: (value: number) => void;
  refundTotal: number;
  currencySymbol: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}

function PartialRefundActions({
  refundMethod,
  onRefundMethodChange,
  returnStatusId,
  onReturnStatusChange,
  refundTotal,
  description,
  onDescriptionChange,
  isSubmitting,
  canSubmit,
  onSubmit,
}: PartialRefundActionsProps) {
  const rate = useCurrentExchangeRate();
  return (
    <div className="border-t border-gray-200 pt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Método de reembolso"
          value={String(refundMethod)}
          onChange={(e) => onRefundMethodChange(Number(e.target.value))}
          options={paymentMethods.map((m) => ({
            value: String(m.value),
            label: m.label,
          }))}
        />
        <Select
          label="Estado del reembolso"
          value={String(returnStatusId)}
          onChange={(e) => onReturnStatusChange(Number(e.target.value))}
          options={refundStatuses.map((s) => ({
            value: String(s.value),
            label: s.label,
          }))}
        />
        <div className="flex flex-col justify-end">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Total a reembolsar
          </p>
          <DualCurrencyAmount amountBs={refundTotal} rate={rate} bold />
        </div>
      </div>
      {/* Description — required */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Descripción del reembolso <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          rows={3}
          placeholder="Indique el motivo del reembolso..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting || !canSubmit || !description.trim()}
          onClick={onSubmit}
        >
          Registrar reembolso parcial
        </Button>
      </div>
    </div>
  );
}

interface FullRefundActionsProps {
  isSubmitting: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
}

function FullRefundActions({
  isSubmitting,
  description,
  onDescriptionChange,
  onSubmit,
}: FullRefundActionsProps) {
  return (
    <div className="border-t border-gray-200 pt-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Descripcion del reembolso <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          rows={3}
          placeholder="Indique el motivo del reembolso completo..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="danger"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting || !description.trim()}
          onClick={onSubmit}
        >
          <IconTrash />
          Registrar reembolso completo
        </Button>
      </div>
    </div>
  );
}
