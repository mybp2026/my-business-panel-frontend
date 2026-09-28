import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";

import { returnsApi } from "@/api/returns.api";
import { paymentMethods, refundStatuses } from "@/constants/payment-methods";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import type { ReturnTransactionDetail } from "@/interfaces/entities/ReturnTransaction.interface";

import { formatDate } from "./refunds.utils";

const statusVariant = (statusId: number | null): "green" | "red" | "yellow" | "gray" => {
  if (statusId === 3) return "green";
  if (statusId === 2) return "red";
  if (statusId === 1) return "yellow";
  return "gray";
};

export function ReturnDetailModal({
  returnId,
  onClose,
}: {
  returnId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ReturnTransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rate = useCurrentExchangeRate();

  useEffect(() => {
    returnsApi
      .getDetail(returnId)
      .then((d) => setDetail(d))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error al cargar reembolso"),
      )
      .finally(() => setLoading(false));
  }, [returnId]);

  const tx = detail?.transaction;
  const products = detail?.products ?? [];
  const paymentLabel =
    paymentMethods.find((m) => m.value === tx?.refund_method)?.label ??
    tx?.payment_method_name ??
    "—";
  const statusLabel =
    refundStatuses.find((s) => s.value === tx?.return_status_id)?.label ??
    tx?.status_name ??
    "—";
  const customerName = tx?.customer_first_name
    ? `${tx.customer_first_name} ${tx.customer_last_name ?? ""}`.trim()
    : "—";

  return (
    <Modal isOpen onClose={onClose} title="Detalle de Reembolso" size="lg">
      {loading && (
        <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
      )}
      {error && (
        <p className="text-sm text-red-500 text-center py-8">{error}</p>
      )}
      {tx && (
        <div className="space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="ID Transacción" mono value={tx.return_transaction_id} />
            <InfoField label="Fecha" value={formatDate(tx.return_date)} />
            <InfoField label="Cliente" value={customerName} />
            <InfoField label="Documento" value={tx.customer_document ?? "—"} />
            <InfoField
              label="Factura"
              mono
              value={tx.invoice_id ?? "—"}
            />
          </div>

          {/* Status & method */}
          <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-4 items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Estado
              </p>
              <Badge variant={statusVariant(tx.return_status_id)}>
                {statusLabel}
              </Badge>
            </div>
            <InfoField label="Método de reembolso" value={paymentLabel} />
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Monto total reembolsado
              </p>
              <DualCurrencyAmount
                amountBs={Number(tx.total_refund_amount)}
                rate={rate}
                bold
              />
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Descripción / Motivo
            </p>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-xl p-3">
              {tx.description || "—"}
            </p>
          </div>

          {/* Products */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Productos reembolsados
            </p>
            {products.length === 0 ? (
              <p className="text-sm text-gray-400">Sin detalle de productos.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-3">Producto</th>
                    <th className="pb-2 pr-3">SKU</th>
                    <th className="pb-2 pr-3 text-right">Cant.</th>
                    <th className="pb-2 pr-3 text-right">Precio unit.</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p) => (
                    <tr key={p.return_product_id}>
                      <td className="py-2 pr-3">{p.variant_name ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                        {p.sku ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">{p.quantity}</td>
                      <td className="py-2 pr-3 text-right">
                        <DualCurrencyAmount amountBs={Number(p.unit_price)} rate={rate} align="right" />
                      </td>
                      <td className="py-2 text-right font-medium">
                        <DualCurrencyAmount amountBs={Number(p.total_price)} rate={rate} bold align="right" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 mt-4">
        <Button type="button" variant="ghost" fullWidth onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}

function InfoField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p
        className={`text-sm text-gray-900 ${mono ? "font-mono break-all" : ""}`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
