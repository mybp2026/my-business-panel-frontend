import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

import type {
  PaymentMethodCatalog,
  PurchaseDispute,
  PurchaseMatching,
  PurchaseOrderDetail,
} from "@/interfaces/entities/Purchase.interface";
import type { CreatePurchasePaymentRequest } from "@/interfaces/api/requests/PurchaseModuleRequests.interface";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaymentMethodName,
  getOrderStatusTone,
  getPayableStatusTone,
} from "@/utils/purchase";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { currencies } from "@/constants/payment-methods";
import { purchaseApi } from "@/api/purchase.api";

// Moneda base del sistema (Venezuela). Antes VES_CURRENCY_ID, mismo id.
const VES_CURRENCY_ID = 1;

// Estado de orden que habilita edicion de factura ("enviada" / Shipped).
const INVOICE_EDITABLE_ORDER_STATUS_ID = 2;

const disputeTypeLabels: Record<string, string> = {
  MISSING_GOODS: "Mercancía incompleta",
  PRICE_MISMATCH: "Precio distinto al pactado",
};

interface PurchaseOrderDetailPanelProps {
  order: PurchaseOrderDetail;
  matching?: PurchaseMatching | null;
  showTenant?: boolean;
  /**
   * Payment methods catalog used by the inline quick-payment form. When not
   * provided, the form is hidden.
   */
  paymentMethods?: PaymentMethodCatalog[];
  /**
   * Persists a new payment against the order's account payable. The parent
   * is responsible for refreshing `order` after a successful submission.
   */
  onRegisterPayment?: (
    payload: CreatePurchasePaymentRequest,
  ) => Promise<void> | void;
  onUpdatePayment?: (
    paymentId: string,
    payload: Partial<CreatePurchasePaymentRequest>,
  ) => Promise<void> | void;
}

const cell = "px-3 py-2 text-sm text-gray-700 align-top";
const headerCell =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500";

export function PurchaseOrderDetailPanel({
  order,
  matching,
  showTenant = false,
  paymentMethods,
  onRegisterPayment,
  onUpdatePayment,
}: PurchaseOrderDetailPanelProps) {
  const [productsOnly, setProductsOnly] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [quickPaymentSubmitting, setQuickPaymentSubmitting] = useState(false);
  const [quickPaymentError, setQuickPaymentError] = useState<string | null>(
    null,
  );
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState<{
    amount_paid: string;
    payment_method_id: number;
    payment_reference: string;
  }>({ amount_paid: "", payment_method_id: 0, payment_reference: "" });
  const [isEditingPaymentSubmitting, setIsEditingPaymentSubmitting] =
    useState(false);
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(
    null,
  );
  const [invoiceEditItems, setInvoiceEditItems] = useState<
    Array<{ product_variant_id: string; label: string; quantity_billed: string; unit_price: string }>
  >([]);
  const [isInvoiceEditSubmitting, setIsInvoiceEditSubmitting] =
    useState(false);
  const [invoiceEditError, setInvoiceEditError] = useState<string | null>(
    null,
  );

  const [disputes, setDisputes] = useState<PurchaseDispute[]>([]);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeForm, setDisputeForm] = useState<{
    dispute_type: "MISSING_GOODS" | "PRICE_MISMATCH";
    description: string;
  }>({ dispute_type: "MISSING_GOODS", description: "" });
  const [isDisputeSubmitting, setIsDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(
    null,
  );
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    purchaseApi
      .listDisputesByOrder(order.purchase_order_id)
      .then((rows) => {
        if (!cancelled) setDisputes(rows);
      })
      .catch(() => {
        if (!cancelled) setDisputes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [order.purchase_order_id]);

  const isInvoiceEditable =
    order.purchase_order_status_id === INVOICE_EDITABLE_ORDER_STATUS_ID;

  const openInvoiceEdit = (invoiceId: string) => {
    setInvoiceEditError(null);
    setInvoiceEditItems(
      order.items.map((item) => ({
        product_variant_id: item.product_variant_id,
        label: item.variant_name ?? item.product_variant_id,
        quantity_billed: String(item.quantity_ordered),
        unit_price: String(item.unit_price),
      })),
    );
    setEditingInvoiceId(invoiceId);
  };

  const submitInvoiceEdit = async () => {
    if (!editingInvoiceId) return;

    const items = invoiceEditItems.map((item) => ({
      product_variant_id: item.product_variant_id,
      quantity_billed: Number(item.quantity_billed),
      unit_price: Number(item.unit_price),
    }));

    if (items.some((i) => !i.quantity_billed || !i.unit_price)) {
      setInvoiceEditError("Cantidad y costo unitario deben ser mayores a 0");
      return;
    }

    setIsInvoiceEditSubmitting(true);
    setInvoiceEditError(null);
    try {
      await purchaseApi.updateSupplierInvoice(editingInvoiceId, { items });
      setEditingInvoiceId(null);
    } catch (err) {
      setInvoiceEditError(
        err instanceof Error ? err.message : "Error al actualizar la factura",
      );
    } finally {
      setIsInvoiceEditSubmitting(false);
    }
  };

  const submitDispute = async () => {
    if (!disputeForm.description.trim()) {
      setDisputeError("Describe la discrepancia");
      return;
    }

    setIsDisputeSubmitting(true);
    setDisputeError(null);
    try {
      const created = await purchaseApi.createDispute({
        purchase_order_id: order.purchase_order_id,
        dispute_type: disputeForm.dispute_type,
        description: disputeForm.description.trim(),
      });
      setDisputes((prev) => [created, ...prev]);
      setShowDisputeForm(false);
      setDisputeForm({ dispute_type: "MISSING_GOODS", description: "" });
    } catch (err) {
      setDisputeError(
        err instanceof Error ? err.message : "Error al reportar la discrepancia",
      );
    } finally {
      setIsDisputeSubmitting(false);
    }
  };

  const submitResolveDispute = async (disputeId: string) => {
    if (!resolutionNotes.trim()) return;
    try {
      const resolved = await purchaseApi.resolveDispute(disputeId, {
        resolution_notes: resolutionNotes.trim(),
      });
      setDisputes((prev) =>
        prev.map((d) => (d.dispute_id === disputeId ? resolved : d)),
      );
      setResolvingDisputeId(null);
      setResolutionNotes("");
    } catch {
      // El error se refleja dejando el formulario abierto para reintentar.
    }
  };

  const balanceDue = Number(order.balance_due ?? 0);
  const accountPayableId = order.purchase_account_payable_id ?? "";
  const isPaid = !!order.is_paid || balanceDue <= 0;

  const canQuickPay = useMemo(() => {
    return (
      !!onRegisterPayment &&
      !!paymentMethods &&
      paymentMethods.length > 0 &&
      !!accountPayableId &&
      !isPaid
    );
  }, [onRegisterPayment, paymentMethods, accountPayableId, isPaid]);

  const filteredPaymentMethods = useMemo(() => {
    return (paymentMethods ?? []).filter(
      (method) => Number(method.payment_method_id) !== 5,
    );
  }, [paymentMethods]);

  const defaultMethodId = filteredPaymentMethods?.[0]?.payment_method_id ?? 0;

  const [quickPaymentForm, setQuickPaymentForm] = useState<{
    amount_paid: string;
    payment_method_id: number;
    payment_reference: string;
    currency_id: number;
    exchange_rate_override: string;
  }>(() => ({
    amount_paid: balanceDue > 0 ? String(balanceDue) : "",
    payment_method_id: defaultMethodId,
    payment_reference: "",
    currency_id: VES_CURRENCY_ID,
    exchange_rate_override: "",
  }));

  const round2 = (value: number) => Number(value.toFixed(2));

  const effectiveExchangeRate = useMemo(() => {
    const parsed = parseFloat(quickPaymentForm.exchange_rate_override);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return exchangeRate ?? 0;
  }, [quickPaymentForm.exchange_rate_override, exchangeRate]);

  const amount = Number(quickPaymentForm.amount_paid) || 0;
  const convertedAmount = useMemo(() => {
    if (quickPaymentForm.currency_id === VES_CURRENCY_ID) {
      if (effectiveExchangeRate <= 0) return null;
      return round2(amount / effectiveExchangeRate);
    } else {
      if (effectiveExchangeRate <= 0) return null;
      return round2(amount * effectiveExchangeRate);
    }
  }, [amount, quickPaymentForm.currency_id, effectiveExchangeRate]);

  useEffect(() => {
    let cancelled = false;
    // Una sola tasa en el sistema: USD -> VES. La direccion inversa es su
    // reciproco, no una fila aparte.
    const toVes = quickPaymentForm.currency_id === VES_CURRENCY_ID;
    if (toVes) {
      exchangeRateApi
        .getLatest()
        .then((rate) => {
          if (!cancelled) setExchangeRate(rate ? Number(rate.rate) : null);
        })
        .catch(() => {
          if (!cancelled) setExchangeRate(null);
        });
    } else {
      exchangeRateApi
        .getLatest()
        .then((rate) => {
          const r = rate ? Number(rate.rate) : 0;
          if (!cancelled) setExchangeRate(r > 0 ? 1 / r : null);
        })
        .catch(() => {
          if (!cancelled) setExchangeRate(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [quickPaymentForm.currency_id]);

  const openQuickPayment = () => {
    setQuickPaymentError(null);
    setQuickPaymentForm({
      amount_paid: balanceDue > 0 ? String(balanceDue) : "",
      payment_method_id: defaultMethodId,
      payment_reference: "",
      currency_id: VES_CURRENCY_ID,
      exchange_rate_override: "",
    });
    setShowQuickPayment(true);
  };

  const submitQuickPayment = async () => {
    if (!onRegisterPayment || !accountPayableId) return;

    const amount = Number(quickPaymentForm.amount_paid);
    if (!Number.isFinite(amount) || amount <= 0) {
      setQuickPaymentError("Ingresa un monto mayor a 0");
      return;
    }
    if (balanceDue > 0 && amount - balanceDue > 0.01) {
      setQuickPaymentError(
        `El abono no puede exceder el saldo pendiente (${formatCurrency(balanceDue)})`,
      );
      return;
    }
    if (!quickPaymentForm.payment_method_id) {
      setQuickPaymentError("Selecciona un método de pago");
      return;
    }

    setQuickPaymentError(null);
    setQuickPaymentSubmitting(true);
    try {
      await onRegisterPayment({
        purchase_account_payable_id: accountPayableId,
        amount_paid: Number(amount.toFixed(2)),
        payment_method_id: quickPaymentForm.payment_method_id,
        payment_reference:
          quickPaymentForm.payment_reference.trim() || undefined,
      });
      setShowQuickPayment(false);
    } catch (err) {
      setQuickPaymentError(
        err instanceof Error ? err.message : "Error al registrar el abono",
      );
    } finally {
      setQuickPaymentSubmitting(false);
    }
  };

  const handleEditPayment = (payment: any) => {
    setEditPaymentForm({
      amount_paid: String(payment.amount_paid),
      payment_method_id: payment.payment_method_id,
      payment_reference: payment.payment_reference ?? "",
    });
    setEditingPaymentId(payment.purchase_order_payment_id);
    setEditPaymentError(null);
  };

  const submitEditPayment = async () => {
    if (!onUpdatePayment || !editingPaymentId) return;

    const amount = Number(editPaymentForm.amount_paid);
    if (!Number.isFinite(amount) || amount <= 0) {
      setEditPaymentError("Ingresa un monto mayor a 0");
      return;
    }

    // Logic for checking if the new amount exceeds balance might be tricky here
    // since balanceDue already reflects the OLD amount being paid.
    // However, usually we can just let the backend handle it or do a rough check.

    setIsEditingPaymentSubmitting(true);
    try {
      await onUpdatePayment(editingPaymentId, {
        amount_paid: amount,
        payment_method_id: editPaymentForm.payment_method_id,
        payment_reference:
          editPaymentForm.payment_reference.trim() || undefined,
      });
      setEditingPaymentId(null);
    } catch (err) {
      setEditPaymentError(
        err instanceof Error ? err.message : "Error al actualizar el abono",
      );
    } finally {
      setIsEditingPaymentSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Vista
          </p>
          <p className="text-sm text-gray-700">
            {productsOnly
              ? "Mostrando solo los productos comprados en esta orden."
              : "Mostrando todos los detalles de la orden."}
          </p>
        </div>
        <Button
          type="button"
          variant={productsOnly ? "primary" : "secondary"}
          size="sm"
          onClick={() => setProductsOnly((prev) => !prev)}
        >
          {productsOnly ? "Ver detalles completos" : "Ver solo productos"}
        </Button>
      </div>

      {!productsOnly && (
        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-orange-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Orden de compra
                </p>
                <h3 className="text-xl font-semibold text-gray-900">
                  {order.supplier_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {order.purchase_order_id}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={getOrderStatusTone(order.purchase_order_status_name)}
                >
                  {order.purchase_order_status_name}
                </Badge>
                {order.account_payable_status_name && (
                  <Badge
                    variant={getPayableStatusTone(
                      order.account_payable_status_name,
                    )}
                  >
                    {order.account_payable_status_name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SummaryField
                label="Bodega"
                value={order.warehouse_name ?? "—"}
              />
              <SummaryField label="Sucursal" value={order.branch_name ?? "—"} />
              <SummaryField
                label="Fecha de orden"
                value={formatDate(order.purchase_order_date)}
              />
              <SummaryField
                label="Entrega esperada"
                value={formatDate(order.expected_delivery_date)}
              />
              <SummaryField
                label="Vencimiento"
                value={formatDate(order.due_date)}
              />
              {order.payment_due_date && (
                <SummaryField
                  label="Fecha límite de pago"
                  value={formatDate(order.payment_due_date)}
                />
              )}
              <SummaryField
                label="Condición"
                value={
                  order.payment_condition === "IN_FULL"
                    ? "Pago completo"
                    : "Crédito"
                }
              />
              {showTenant && (
                <SummaryField
                  label="Tenant"
                  value={order.tenant_name ?? order.tenant_id ?? "—"}
                />
              )}
              <SummaryField
                label="Factura"
                value={order.invoice_number ?? "Sin factura asociada"}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Totales
            </p>
            <div className="mt-4 space-y-3">
              <AmountRow
                label="Subtotal"
                value={formatCurrency(order.subtotal)}
              />
              <AmountRow
                label="Impuesto"
                value={formatCurrency(order.tax_amount)}
              />
              <AmountRow
                label="Total"
                value={formatCurrency(order.total_amount)}
                emphasized
              />
              <AmountRow
                label="Abonado"
                value={formatCurrency(order.amount_paid)}
              />
              <AmountRow
                label="Pendiente"
                value={formatCurrency(order.balance_due)}
                emphasized
              />
            </div>
          </section>
        </div>
      )}

      <Section
        title="Items"
        action={
          <p className="text-xs text-gray-500">
            Las columnas <span className="font-medium">Vendido 30d</span>,{" "}
            <span className="font-medium">Vendido desde OC</span> e{" "}
            <span className="font-medium">Histórico</span> reflejan ventas
            completadas para analizar la rotación.
          </p>
        }
      >
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={headerCell}>SKU</th>
                <th className={headerCell}>Producto</th>
                <th className={headerCell}>Cantidad</th>
                <th className={headerCell}>Costo unitario</th>
                <th className={headerCell}>Total</th>
                <th className={headerCell}>Vendido 30d</th>
                <th className={headerCell}>Vendido desde OC</th>
                <th className={headerCell}>Histórico</th>
                <th className={headerCell}>Última venta</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const sold30 = Number(item.sales_quantity_30d ?? 0);
                const soldSincePo = Number(item.sales_quantity_since_po ?? 0);
                const soldLifetime = Number(item.sales_quantity_lifetime ?? 0);
                const ordered = Number(item.quantity_ordered ?? 0);
                const sinceRatio =
                  ordered > 0 ? Math.min(soldSincePo / ordered, 1) : 0;
                return (
                  <tr
                    key={item.purchase_order_item_id}
                    className="border-t border-gray-200"
                  >
                    <td className={`${cell} font-mono text-xs text-gray-500`}>
                      {item.sku ?? "—"}
                    </td>
                    <td className={cell}>
                      {item.variant_name ?? item.product_variant_id}
                    </td>
                    <td className={cell}>{ordered}</td>
                    <td className={cell}>{formatCurrency(item.unit_price)}</td>
                    <td className={cell}>{formatCurrency(item.line_total)}</td>
                    <td className={cell}>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {sold30}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {formatCurrency(item.sales_revenue_30d)}
                        </span>
                      </div>
                    </td>
                    <td className={cell}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-medium text-gray-900">
                            {soldSincePo}
                          </span>
                          {ordered > 0 && (
                            <span className="text-[11px] text-gray-500">
                              de {ordered} ({Math.round(sinceRatio * 100)}%)
                            </span>
                          )}
                        </div>
                        {ordered > 0 && (
                          <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${Math.round(sinceRatio * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={cell}>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {soldLifetime}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {formatCurrency(item.sales_revenue_lifetime)}
                        </span>
                      </div>
                    </td>
                    <td className={`${cell} text-xs text-gray-500`}>
                      {item.last_sold_at
                        ? formatDate(item.last_sold_at)
                        : "Sin ventas"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {!productsOnly && (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Facturas">
              {order.invoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                  No hay facturas registradas para esta orden.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  {order.invoices.map((invoice) => (
                    <div
                      key={invoice.supplier_invoice_id}
                      className="border-t border-gray-200 px-4 py-3 first:border-t-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(invoice.invoice_date)} ·{" "}
                            {invoice.payment_condition}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-gray-700">
                            {formatCurrency(invoice.total_amount)}
                          </span>
                          <Badge variant={invoice.paid ? "green" : "yellow"}>
                            {invoice.paid ? "Pagada" : "Pendiente"}
                          </Badge>
                          {isInvoiceEditable &&
                            editingInvoiceId !== invoice.supplier_invoice_id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openInvoiceEdit(invoice.supplier_invoice_id)
                                }
                              >
                                Editar factura
                              </Button>
                            )}
                        </div>
                      </div>

                      {editingInvoiceId === invoice.supplier_invoice_id && (
                        <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                          {invoiceEditItems.map((item, index) => (
                            <div
                              key={item.product_variant_id}
                              className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_1fr]"
                            >
                              <p className="self-center text-xs text-gray-700">
                                {item.label}
                              </p>
                              <Input
                                label="Cantidad"
                                type="number"
                                min="1"
                                value={item.quantity_billed}
                                onChange={(e) =>
                                  setInvoiceEditItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index
                                        ? { ...it, quantity_billed: e.target.value }
                                        : it,
                                    ),
                                  )
                                }
                              />
                              <Input
                                label="Costo unitario"
                                type="number"
                                min="0.01"
                                step="0.001"
                                value={item.unit_price}
                                onChange={(e) =>
                                  setInvoiceEditItems((prev) =>
                                    prev.map((it, i) =>
                                      i === index
                                        ? { ...it, unit_price: e.target.value }
                                        : it,
                                    ),
                                  )
                                }
                              />
                            </div>
                          ))}

                          {invoiceEditError && (
                            <p className="text-xs text-red-600 font-medium">
                              {invoiceEditError}
                            </p>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingInvoiceId(null)}
                              disabled={isInvoiceEditSubmitting}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={submitInvoiceEdit}
                              loading={isInvoiceEditSubmitting}
                            >
                              Guardar cambios
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Pagos registrados"
              action={
                canQuickPay && !showQuickPayment ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={openQuickPayment}
                  >
                    Registrar abono
                  </Button>
                ) : null
              }
            >
              {showQuickPayment && canQuickPay && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Nuevo abono
                      </p>
                      <p className="text-xs text-amber-700">
                        Saldo pendiente:{" "}
                        <span className="font-mono">
                          {formatCurrency(balanceDue)}
                        </span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuickPayment(false)}
                      disabled={quickPaymentSubmitting}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input
                      label="Monto"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quickPaymentForm.amount_paid}
                      onChange={(e) =>
                        setQuickPaymentForm((p) => ({
                          ...p,
                          amount_paid: e.target.value,
                        }))
                      }
                      required
                    />
                    <Select
                      label="Moneda"
                      value={String(quickPaymentForm.currency_id)}
                      onChange={(e) =>
                        setQuickPaymentForm((p) => ({
                          ...p,
                          currency_id: Number(e.target.value),
                          exchange_rate_override: "",
                        }))
                      }
                      options={currencies.map((c) => ({
                        value: String(c.value),
                        label: c.code,
                      }))}
                      required
                    />
                    <Select
                      label="Método de pago"
                      value={String(quickPaymentForm.payment_method_id)}
                      onChange={(e) =>
                        setQuickPaymentForm((p) => ({
                          ...p,
                          payment_method_id: Number(e.target.value),
                        }))
                      }
                      options={filteredPaymentMethods.map((m) => ({
                        value: String(m.payment_method_id),
                        label: formatPaymentMethodName(m.name),
                      }))}
                      required
                    />
                    <Input
                      label="Referencia"
                      placeholder="Opcional"
                      value={quickPaymentForm.payment_reference}
                      onChange={(e) =>
                        setQuickPaymentForm((p) => ({
                          ...p,
                          payment_reference: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {amount > 0 && convertedAmount !== null && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            Conversión en vivo
                          </p>
                          <p className="text-sm font-medium text-blue-900 mt-1">
                            {amount.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {
                              currencies.find(
                                (c) => c.value === quickPaymentForm.currency_id,
                              )?.symbol
                            }{" "}
                            ={" "}
                            <span className="font-semibold">
                              {convertedAmount.toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {quickPaymentForm.currency_id === VES_CURRENCY_ID
                                ? "$"
                                : "Bs."}
                            </span>
                          </p>
                        </div>
                        {effectiveExchangeRate > 0 && (
                          <div className="text-right text-xs text-blue-700">
                            <p className="font-medium">
                              Tasa:{" "}
                              {effectiveExchangeRate.toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {amount > 0 && effectiveExchangeRate <= 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-medium text-amber-800">
                        No hay tasa de cambio disponible. Ingresa una
                        manualmente:
                      </p>
                      <Input
                        label="Tasa de cambio (override)"
                        type="number"
                        min="0"
                        step="0.000001"
                        placeholder="Ej: 510.00"
                        value={quickPaymentForm.exchange_rate_override}
                        onChange={(e) =>
                          setQuickPaymentForm((p) => ({
                            ...p,
                            exchange_rate_override: e.target.value,
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                  )}

                  {amount > 0 &&
                    effectiveExchangeRate > 0 &&
                    quickPaymentForm.exchange_rate_override && (
                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                          Usando tasa personalizada
                        </p>
                        <Input
                          label="Tasa de cambio personalizada"
                          type="number"
                          min="0"
                          step="0.000001"
                          value={quickPaymentForm.exchange_rate_override}
                          onChange={(e) =>
                            setQuickPaymentForm((p) => ({
                              ...p,
                              exchange_rate_override: e.target.value,
                            }))
                          }
                          className="mt-2"
                          hint={`Tasa del sistema: ${exchangeRate?.toLocaleString(
                            "es-VE",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            },
                          )}`}
                        />
                      </div>
                    )}

                  {quickPaymentError && (
                    <p className="text-xs text-red-600 font-medium">
                      {quickPaymentError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1 border-t border-amber-200">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={submitQuickPayment}
                      loading={quickPaymentSubmitting}
                    >
                      Confirmar abono
                    </Button>
                  </div>
                </div>
              )}

              {editingPaymentId && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 mb-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Modificar abono
                      </p>
                      <p className="text-xs text-blue-700 font-mono">
                        ID: {editingPaymentId.slice(0, 8)}...
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPaymentId(null)}
                      disabled={isEditingPaymentSubmitting}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      label="Monto"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editPaymentForm.amount_paid}
                      onChange={(e) =>
                        setEditPaymentForm((p) => ({
                          ...p,
                          amount_paid: e.target.value,
                        }))
                      }
                      required
                    />
                    <Select
                      label="Método de pago"
                      value={String(editPaymentForm.payment_method_id)}
                      onChange={(e) =>
                        setEditPaymentForm((p) => ({
                          ...p,
                          payment_method_id: Number(e.target.value),
                        }))
                      }
                      options={filteredPaymentMethods.map((m) => ({
                        value: String(m.payment_method_id),
                        label: formatPaymentMethodName(m.name),
                      }))}
                      required
                    />
                    <Input
                      label="Referencia"
                      placeholder="Opcional"
                      value={editPaymentForm.payment_reference}
                      onChange={(e) =>
                        setEditPaymentForm((p) => ({
                          ...p,
                          payment_reference: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {editPaymentError && (
                    <p className="text-xs text-red-600 font-medium">
                      {editPaymentError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1 border-t border-blue-200">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={submitEditPayment}
                      loading={isEditingPaymentSubmitting}
                    >
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              )}

              <StackList
                items={order.payments.map((payment) => ({
                  id: payment.purchase_order_payment_id,
                  title:
                    `${formatCurrency(payment.amount_paid)} ${payment.currency_code && payment.currency_code !== "USD" ? `(${payment.currency_code})` : ""}`.trim(),
                  meta: `${formatPaymentMethodName(payment.payment_method_name)} · ${formatDateTime(payment.payment_date)}`,
                  description: payment.payment_reference ?? "Sin referencia",
                  originalData: payment,
                }))}
                onEdit={onUpdatePayment ? handleEditPayment : undefined}
                emptyMessage="Todavía no se han registrado abonos."
              />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Recepciones">
              <StackList
                items={order.goods_receipts.map((receipt) => ({
                  id: receipt.goods_receipt_id,
                  title: formatDateTime(receipt.received_date),
                  meta: `${receipt.items_received} item(s) recibidos`,
                  amount: formatCurrency(receipt.total_amount),
                }))}
                emptyMessage="La orden todavía no ha generado recepción de mercadería."
              />
            </Section>

            <Section title="Three-way matching">
              {matching?.matching_found ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Conciliación{" "}
                        {matching.is_matched ? "exitosa" : "con diferencias"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ejecutada el {formatDateTime(matching.matched_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant={matching.amounts_matched ? "green" : "red"}
                      >
                        Montos{" "}
                        {matching.amounts_matched ? "OK" : "con diferencia"}
                      </Badge>
                      <Badge
                        variant={matching.quantities_matched ? "green" : "red"}
                      >
                        Cantidades{" "}
                        {matching.quantities_matched ? "OK" : "con diferencia"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                  {matching?.message ??
                    "La conciliación todavía no está disponible para esta orden."}
                </div>
              )}
            </Section>
          </div>

          <Section
            title="Discrepancias con el proveedor"
            action={
              !showDisputeForm ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDisputeForm(true)}
                >
                  Reportar discrepancia
                </Button>
              ) : null
            }
          >
            {showDisputeForm && (
              <div className="mb-3 space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <Select
                  label="Tipo de discrepancia"
                  value={disputeForm.dispute_type}
                  onChange={(e) =>
                    setDisputeForm((p) => ({
                      ...p,
                      dispute_type: e.target.value as
                        | "MISSING_GOODS"
                        | "PRICE_MISMATCH",
                    }))
                  }
                  options={[
                    { value: "MISSING_GOODS", label: "Mercancía incompleta" },
                    { value: "PRICE_MISMATCH", label: "Precio distinto al pactado" },
                  ]}
                />
                <Input
                  label="Descripción"
                  value={disputeForm.description}
                  onChange={(e) =>
                    setDisputeForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  hint="Detalla lo ocurrido para el historial de la orden."
                />
                {disputeError && (
                  <p className="text-xs text-red-600 font-medium">
                    {disputeError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDisputeForm(false)}
                    disabled={isDisputeSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={submitDispute}
                    loading={isDisputeSubmitting}
                  >
                    Enviar reporte
                  </Button>
                </div>
              </div>
            )}

            {disputes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                No hay discrepancias reportadas para esta orden.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {disputes.map((dispute) => (
                  <div
                    key={dispute.dispute_id}
                    className="border-t border-gray-200 px-4 py-3 first:border-t-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {disputeTypeLabels[dispute.dispute_type] ??
                            dispute.dispute_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {dispute.description}
                        </p>
                        {dispute.status === "RESOLVED" &&
                          dispute.resolution_notes && (
                            <p className="mt-1 text-xs text-emerald-700">
                              Resolución: {dispute.resolution_notes}
                            </p>
                          )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {dispute.notify_supplier_pending && (
                          <Badge variant="yellow">Pendiente notificar</Badge>
                        )}
                        <Badge
                          variant={
                            dispute.status === "RESOLVED" ? "green" : "red"
                          }
                        >
                          {dispute.status === "RESOLVED"
                            ? "Resuelta"
                            : "Abierta"}
                        </Badge>
                        {dispute.status === "OPEN" &&
                          resolvingDisputeId !== dispute.dispute_id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setResolvingDisputeId(dispute.dispute_id);
                                setResolutionNotes("");
                              }}
                            >
                              Marcar resuelta
                            </Button>
                          )}
                      </div>
                    </div>

                    {resolvingDisputeId === dispute.dispute_id && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <Input
                          label="Notas de resolución"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="flex-1"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setResolvingDisputeId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              submitResolveDispute(dispute.dispute_id)
                            }
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function AmountRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`text-sm ${emphasized ? "font-semibold text-gray-900" : "text-gray-500"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-sm ${emphasized ? "font-semibold text-gray-900" : "text-gray-700"}`}
      >
        {value}
      </span>
    </div>
  );
}

function StackList({
  items,
  emptyMessage,
  onEdit,
}: {
  items: Array<{
    id: string;
    title: string;
    meta?: string;
    description?: string;
    amount?: string;
    badge?: string;
    badgeVariant?: "green" | "yellow" | "red" | "blue" | "secondary";
    originalData?: any;
  }>;
  onEdit?: (item: any) => void;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 border-t border-gray-200 px-4 py-3 first:border-t-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            {item.meta && <p className="text-xs text-gray-500">{item.meta}</p>}
            {item.description && (
              <p className="mt-1 text-xs text-gray-400">{item.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {item.amount && (
              <span className="font-mono text-sm text-gray-700">
                {item.amount}
              </span>
            )}
            {item.badge && (
              <Badge variant={item.badgeVariant ?? "secondary"}>
                {item.badge}
              </Badge>
            )}
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item.originalData || item)}
              >
                Modificar abono
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
