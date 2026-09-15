import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconCheckCircle } from "@/assets/icons";
import type { InvoiceInfo } from "@/interfaces/entities/Sale.interface";
import { usePrintInvoice } from "@/hooks/usePrintInvoice";

interface PaymentSplit {
  id: string;
  methodId: number;
  amount: string;
  currencyId: number;
}

export interface SaleReceiptItem {
  variant_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleResultModalProps {
  isOpen: boolean;
  saleId: string | null;
  totalAmount: number;
  currencySymbol: string;
  items?: SaleReceiptItem[];
  digitalInvoice?: InvoiceInfo | null;
  paymentSplits: PaymentSplit[];
  pointsRedeemed?: number;
  pointsRate?: number;
  onNewSale: () => void;
}

const fmt = (value: number | null | undefined, symbol: string) =>
  `${symbol} ${Number(value ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("es-VE") : "—";

const fmtDateOnly = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("es-VE") : "—";

export function SaleResultModal({
  isOpen,
  saleId,
  totalAmount,
  currencySymbol,
  items,
  digitalInvoice,
  pointsRedeemed,
  pointsRate,
  onNewSale,
}: SaleResultModalProps) {
  const symbol = digitalInvoice?.currency_symbol ?? currencySymbol;
  const { printInvoice } = usePrintInvoice();

  const handlePrint = () => {
    printInvoice({
      saleId,
      digitalInvoice: digitalInvoice ?? null,
      pointsRedeemed,
      pointsRate,
    });
  };

  const tenantIdLabel =
    digitalInvoice?.tenant_identification_type_code ||
    digitalInvoice?.tenant_identification_type_name ||
    "Identificación";
  const customerIdLabel =
    digitalInvoice?.customer_identification_type_code ||
    digitalInvoice?.customer_identification_type_name ||
    "Documento";

  const hasCustomer = !!(
    digitalInvoice &&
    (digitalInvoice.first_name ||
      digitalInvoice.last_name ||
      digitalInvoice.document_number ||
      digitalInvoice.customer_econ_activity ||
      digitalInvoice.email ||
      digitalInvoice.customer_phone ||
      digitalInvoice.customer_address ||
      digitalInvoice.customer_birthdate)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onNewSale}
      title="Venta registrada"
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <IconCheckCircle />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Venta procesada exitosamente
            </h3>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
          <Row
            label="ID de venta"
            value={
              <span className="font-mono text-xs break-all">
                {saleId ?? "—"}
              </span>
            }
          />
          <Row
            label="Total"
            value={
              <span className="font-semibold">{fmt(totalAmount, symbol)}</span>
            }
          />
        </div>

        {digitalInvoice && (
          <>
            <Section title="Emisor">
              {digitalInvoice.tenant_name && (
                <p className="text-base font-semibold text-gray-900 mb-1">
                  {digitalInvoice.tenant_name}
                </p>
              )}
              {(digitalInvoice.branch_name ||
                digitalInvoice.branch_address) && (
                <p className="text-sm text-gray-700 mb-2">
                  {digitalInvoice.branch_name ?? ""}
                  {digitalInvoice.branch_name &&
                  digitalInvoice.branch_address
                    ? " — "
                    : ""}
                  {digitalInvoice.branch_address ?? ""}
                </p>
              )}
              {digitalInvoice.tenant_identification && (
                <Row
                  label={tenantIdLabel}
                  value={digitalInvoice.tenant_identification}
                />
              )}
              {digitalInvoice.tenant_econ_activity && (
                <Row
                  label="Actividad económica"
                  value={digitalInvoice.tenant_econ_activity}
                />
              )}
              {digitalInvoice.tenant_contact_email && (
                <Row label="Email" value={digitalInvoice.tenant_contact_email} />
              )}
              {digitalInvoice.tenant_contact_phone && (
                <Row
                  label="Teléfono"
                  value={digitalInvoice.tenant_contact_phone}
                />
              )}
              {digitalInvoice.tenant_sign && (
                <p className="text-xs text-gray-500 italic mt-2">
                  {digitalInvoice.tenant_sign}
                </p>
              )}
            </Section>

            {hasCustomer && (
              <Section title="Cliente">
                {(digitalInvoice.first_name || digitalInvoice.last_name) && (
                  <Row
                    label="Nombre"
                    value={`${digitalInvoice.first_name ?? ""} ${digitalInvoice.last_name ?? ""}`.trim()}
                  />
                )}
                {digitalInvoice.document_number && (
                  <Row
                    label={customerIdLabel}
                    value={digitalInvoice.document_number}
                  />
                )}
                {digitalInvoice.customer_econ_activity && (
                  <Row
                    label="Actividad económica"
                    value={digitalInvoice.customer_econ_activity}
                  />
                )}
                {digitalInvoice.email && (
                  <Row label="Email" value={digitalInvoice.email} />
                )}
                {digitalInvoice.customer_phone && (
                  <Row label="Teléfono" value={digitalInvoice.customer_phone} />
                )}
                {digitalInvoice.customer_address && (
                  <Row
                    label="Dirección"
                    value={digitalInvoice.customer_address}
                  />
                )}
                {digitalInvoice.customer_birthdate && (
                  <Row
                    label="Fecha de nacimiento"
                    value={fmtDateOnly(digitalInvoice.customer_birthdate)}
                  />
                )}
              </Section>
            )}

            <Section title="Datos de la venta">
              <Row
                label="Condición de venta"
                value={
                  digitalInvoice.sale_condition_desc ??
                  digitalInvoice.sale_condition ??
                  "—"
                }
              />
              <Row
                label="Fecha de venta"
                value={fmtDate(digitalInvoice.sale_date)}
              />
              <Row
                label="Fecha de factura"
                value={fmtDate(digitalInvoice.invoiced_at)}
              />
              {digitalInvoice.due_date && (
                <Row
                  label="Fecha límite pago"
                  value={fmtDateOnly(digitalInvoice.due_date)}
                />
              )}
              <Row
                label="Moneda"
                value={
                  digitalInvoice.currency_code
                    ? `${digitalInvoice.currency_code} (${digitalInvoice.currency_symbol ?? ""})`
                    : "—"
                }
              />
              {digitalInvoice.seller_email && (
                <Row label="Vendedor" value={digitalInvoice.seller_email} />
              )}
            </Section>

            {digitalInvoice.items && digitalInvoice.items.length > 0 && (
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Productos
                </p>
                <div className="rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-2 py-2 text-left">Descripción</th>
                        <th className="px-2 py-2 text-left">SKU</th>
                        <th className="px-2 py-2 text-right">Cant.</th>
                        <th className="px-2 py-2 text-right">P. unit.</th>
                        <th className="px-2 py-2 text-right">Subtotal</th>
                        <th className="px-2 py-2 text-right">IVA %</th>
                        <th className="px-2 py-2 text-right">IVA</th>
                        <th className="px-2 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {digitalInvoice.items.map((it) => (
                        <tr
                          key={it.invoice_item_id}
                          className="bg-white"
                        >
                          <td className="px-2 py-2 text-gray-900">
                            {it.description || it.variant_name || "—"}
                          </td>
                          <td className="px-2 py-2 font-mono text-gray-500">
                            {it.sku ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-700">
                            {it.quantity}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-700">
                            {fmt(it.unit_price, symbol)}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-700">
                            {fmt(it.subtotal, symbol)}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-500">
                            {Number(it.tax_rate_percentage ?? 0)}%
                          </td>
                          <td className="px-2 py-2 text-right text-gray-700">
                            {fmt(it.tax_amount, symbol)}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-gray-900">
                            {fmt(it.total_price, symbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {digitalInvoice.payments &&
              digitalInvoice.payments.length > 0 && (
                <Section title="Métodos de pago">
                  <div className="space-y-1">
                    {digitalInvoice.payments.map((p) => {
                      const sym = p.currency_symbol ?? symbol;
                      const label = p.is_points_redemption
                        ? `${p.payment_method_name ?? "Puntos"} (puntos: ${p.points_redeemed})`
                        : (p.payment_method_name ?? "Método");
                      return (
                        <div
                          key={p.customer_payment_id}
                          className="flex justify-between gap-2 text-sm"
                        >
                          <span className="text-gray-700">{label}</span>
                          <span className="font-semibold text-gray-900">
                            {fmt(p.payment_amount, sym)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

            <Section title="Resumen">
              <Row
                label="Subtotal"
                value={fmt(digitalInvoice.subtotal_amount, symbol)}
              />
              {digitalInvoice.total_discount > 0 && (
                <Row
                  label="Descuentos"
                  value={`-${fmt(digitalInvoice.total_discount, symbol)}`}
                />
              )}
              <Row
                label="Impuestos"
                value={fmt(digitalInvoice.tax_amount, symbol)}
              />
              <Row
                label="Total"
                value={
                  <span className="font-semibold">
                    {fmt(digitalInvoice.total_amount, symbol)}
                  </span>
                }
              />
              {digitalInvoice.amount_paid > 0 && (
                <Row
                  label="Monto pagado"
                  value={fmt(digitalInvoice.amount_paid, symbol)}
                />
              )}
              {digitalInvoice.change_amount > 0 && (
                <Row
                  label="Cambio"
                  value={fmt(digitalInvoice.change_amount, symbol)}
                />
              )}
              {!!pointsRedeemed &&
                pointsRedeemed > 0 &&
                !!pointsRate &&
                pointsRate > 0 && (
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Puntos canjeados
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-amber-800">
                          -{pointsRedeemed.toLocaleString("es-VE")} pts
                        </span>
                        <p className="text-xs text-amber-700 mt-0.5">
                          ≈ {fmt(Math.floor(pointsRedeemed / pointsRate), "Bs.")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              {digitalInvoice.points_accumulated > 0 && (
                <div className="border-t border-gray-200 pt-2 mt-2 bg-purple-50 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-purple-900">
                      Puntos de fidelidad otorgados
                    </span>
                    <span className="text-lg font-bold text-purple-700">
                      +{digitalInvoice.points_accumulated}
                    </span>
                  </div>
                </div>
              )}
            </Section>

            {digitalInvoice.ad_message && (
              <div className="text-left border border-gray-200 rounded-xl p-3 text-sm text-gray-600 italic bg-white">
                {digitalInvoice.ad_message}
              </div>
            )}
          </>
        )}

        {!digitalInvoice && items && items.length > 0 && (
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Productos vendidos
            </p>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={i} className="bg-white">
                      <td className="px-3 py-2 text-gray-900">
                        <div>{item.variant_name}</div>
                        {item.sku && (
                          <div className="text-xs font-mono text-gray-400">
                            {item.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {fmt(item.total_price, symbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={handlePrint}
            disabled={!digitalInvoice}
            className="flex-1"
          >
            Imprimir
          </Button>
          <Button variant="primary" onClick={onNewSale} className="flex-1">
            Aceptar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {title}
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}
