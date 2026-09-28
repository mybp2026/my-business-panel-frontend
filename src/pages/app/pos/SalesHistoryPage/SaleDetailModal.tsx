import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";
import { usePrintInvoice } from "@/hooks/usePrintInvoice";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { CreditDebitNotesSection } from "./CreditDebitNotesSection";
import {
  getInvoiceForSale,
  getSaleItemsForSale,
} from "@/router/actions/sale.actions";
import type {
  InvoiceInfo,
  SaleItemDetail,
  SaleListItem,
} from "@/interfaces/entities/Sale.interface";

interface SaleDetailModalProps {
  isOpen: boolean;
  sale: SaleListItem | null;
  onClose: () => void;
}

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("es-VE") : "—";

export function SaleDetailModal({
  isOpen,
  sale,
  onClose,
}: SaleDetailModalProps) {
  const [digitalInvoice, setDigitalInvoice] =
    useState<InvoiceInfo | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !sale) {
      setDigitalInvoice(null);
      setSaleItems([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      getInvoiceForSale(sale.sale_id),
      getSaleItemsForSale(sale.sale_id),
    ])
      .then(([invoice, items]) => {
        if (cancelled) return;
        setDigitalInvoice(invoice);
        setSaleItems(items);
      })
      .catch(() => {
        if (!cancelled) {
          setDigitalInvoice(null);
          setSaleItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sale]);

  const { printInvoice } = usePrintInvoice();
  const rate = useCurrentExchangeRate();

  if (!sale) return null;

  const royaltyItems = saleItems.filter(
    (item) => Number(item.unit_price) === 0 && Number(item.total_price) === 0,
  );
  const billedItems = saleItems.filter(
    (item) =>
      !(Number(item.unit_price) === 0 && Number(item.total_price) === 0),
  );
  const promoItems = saleItems.filter(
    (item) =>
      item.sale_price_type === "PROMO" &&
      Number(item.discount_applied ?? 0) > 0,
  );

  const handlePrint = () => {
    printInvoice({
      saleId: sale.sale_id,
      digitalInvoice,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de la venta"
      size="lg"
    >
      <div className="space-y-6">
        {/* ── Encabezado de la venta ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ID de venta" value={sale.sale_id} mono />
          <Field label="Sucursal" value={sale.branch_name} />
          <Field label="Fecha" value={formatDateTime(sale.sale_date)} />
          <Field
            label="Estado"
            valueNode={
              <Badge variant={sale.is_completed ? "green" : "yellow"}>
                {sale.is_completed ? "Completada" : "Pendiente"}
              </Badge>
            }
          />
          <Field
            label="Subtotal"
            valueNode={<DualCurrencyAmount amountBs={sale.subtotal_amount} rate={rate} />}
          />
          <Field
            label="Impuestos"
            valueNode={<DualCurrencyAmount amountBs={sale.tax_amount} rate={rate} />}
          />
          <Field
            label="Total"
            valueNode={<DualCurrencyAmount amountBs={sale.total_amount} rate={rate} bold />}
          />
        </div>

        {/* ── Productos ──────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Productos
          </h3>
          {isLoading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : billedItems.length > 0 ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">P. unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billedItems.map((item, i) => (
                    <tr key={i} className="bg-white">
                      <td className="px-3 py-2 text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-500 text-xs">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        <DualCurrencyAmount amountBs={item.unit_price} rate={rate} align="right" />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        <DualCurrencyAmount amountBs={item.total_price} rate={rate} bold align="right" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No hay productos registrados.
            </p>
          )}
        </div>

        {/* ── Descuentos por promoción ───────────────────────────────── */}
        {!isLoading && promoItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Descuentos por promoción
            </h3>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
              {promoItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="text-gray-800 font-medium">
                      {item.product_name}
                    </span>
                    {item.promotion_name && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 rounded-md px-2 py-0.5">
                        {item.promotion_name}
                      </span>
                    )}
                  </div>
                  <span className="text-emerald-700 whitespace-nowrap">
                    <DualCurrencyAmount
                      amountBs={-(item.discount_applied ?? 0)}
                      rate={rate}
                      bold
                      align="right"
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Productos regalados (regalías) ─────────────────────────── */}
        {!isLoading && royaltyItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Productos regalados
            </h3>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              {royaltyItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="text-gray-800 font-medium">
                      {item.product_name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      SKU: {item.sku}
                    </span>
                  </div>
                  <span className="text-amber-700 font-semibold whitespace-nowrap">
                    {item.quantity} unid. gratis
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Factura ───────────────────────────────────────────────────── */}
        <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Factura
            </h3>
            {isLoading ? (
              <p className="text-sm text-gray-400">Cargando…</p>
            ) : digitalInvoice ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <Field
                  label="Fecha de factura"
                  value={formatDateTime(digitalInvoice.invoiced_at)}
                />
                {(digitalInvoice.first_name || digitalInvoice.last_name) && (
                  <Field
                    label="Cliente"
                    value={`${digitalInvoice.first_name ?? ""} ${digitalInvoice.last_name ?? ""}`.trim()}
                  />
                )}
                {digitalInvoice.document_number && (
                  <Field
                    label="Documento"
                    value={digitalInvoice.document_number}
                  />
                )}
                {digitalInvoice.email && (
                  <Field label="Email" value={digitalInvoice.email} />
                )}
                <Field
                  label="Subtotal"
                  valueNode={
                    <DualCurrencyAmount
                      amountBs={digitalInvoice.subtotal_amount}
                      rate={rate}
                    />
                  }
                />
                <Field
                  label="Descuentos"
                  valueNode={
                    <DualCurrencyAmount
                      amountBs={-digitalInvoice.total_discount}
                      rate={rate}
                    />
                  }
                />
                <Field
                  label="Impuestos"
                  valueNode={
                    <DualCurrencyAmount
                      amountBs={digitalInvoice.tax_amount}
                      rate={rate}
                    />
                  }
                />
                <Field
                  label="Total"
                  valueNode={
                    <DualCurrencyAmount
                      amountBs={digitalInvoice.total_amount}
                      rate={rate}
                      bold
                    />
                  }
                />
                {digitalInvoice.amount_paid > 0 && (
                  <Field
                    label="Monto pagado"
                    valueNode={
                      <DualCurrencyAmount
                        amountBs={digitalInvoice.amount_paid}
                        rate={rate}
                      />
                    }
                  />
                )}
                <Field
                  label="Vuelto"
                  valueNode={
                    <DualCurrencyAmount
                      amountBs={digitalInvoice.change_amount}
                      rate={rate}
                    />
                  }
                />
                <Field
                  label="Puntos de fidelidad obtenidos"
                  value={String(digitalInvoice.points_accumulated ?? 0)}
                />
                <Field
                  label="Puntos de fidelidad canjeados"
                  value={String(digitalInvoice.points_redeemed ?? 0)}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No hay factura registrada.
              </p>
            )}
          </div>

        {/* ── Notas de crédito / débito ──────────────────────────────── */}
        {!isLoading && digitalInvoice && (
          <CreditDebitNotesSection
            invoiceId={digitalInvoice.invoice_id}
            currencySymbol="Bs."
          />
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="secondary"
            onClick={handlePrint}
            disabled={isLoading || !digitalInvoice}
          >
            Imprimir
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value?: string | number;
  valueNode?: React.ReactNode;
  mono?: boolean;
}

function Field({ label, value, valueNode, mono }: FieldProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <div
        className={`mt-1 text-sm text-gray-900 ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {valueNode ?? value ?? "—"}
      </div>
    </div>
  );
}
