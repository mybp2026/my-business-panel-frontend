import { useCallback } from "react";
import type { InvoiceInfo } from "@/interfaces/entities/Sale.interface";

export interface PrintInvoiceData {
  saleId?: string | null;
  digitalInvoice: InvoiceInfo | null;
  pointsRedeemed?: number;
  pointsRate?: number;
}

const fmt = (value: number | null | undefined, symbol: string) =>
  `${symbol}${Number(value ?? 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
  })}`;

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("es-CR") : "—";

const fmtDateOnly = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("es-CR") : "—";

const esc = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

function buildInvoiceHtml(data: PrintInvoiceData): string {
  const { saleId, digitalInvoice, pointsRedeemed, pointsRate } = data;
  const inv = digitalInvoice;
  const symbol = inv?.currency_symbol ?? "Bs.";

  const customerName = inv
    ? `${inv.first_name ?? ""} ${inv.last_name ?? ""}`.trim()
    : "";

  // Compact label/value row for thermal ticket
  const row = (label: string, value: string) =>
    `<div class="row"><span class="lbl">${esc(label)}</span><span class="val">${value}</span></div>`;

  const line = (text: string) => `<div class="line">${text}</div>`;

  const sep = `<div class="sep"></div>`;

  const sectionTitle = (title: string) =>
    `<div class="sect-title">${esc(title)}</div>`;

  const tenantIdLabel =
    inv?.tenant_identification_type_code ||
    inv?.tenant_identification_type_name ||
    "ID";
  const customerIdLabel =
    inv?.customer_identification_type_code ||
    inv?.customer_identification_type_name ||
    "Doc";

  const tenantHeader = inv
    ? (inv.tenant_name
        ? `<div class="title">${esc(inv.tenant_name)}</div>`
        : "") +
      (inv.branch_name
        ? `<div class="subtitle">${esc(inv.branch_name)}</div>`
        : "") +
      (inv.branch_address
        ? `<div class="muted-center">${esc(inv.branch_address)}</div>`
        : "") +
      (inv.tenant_identification
        ? `<div class="muted-center">${esc(tenantIdLabel)}: ${esc(inv.tenant_identification)}</div>`
        : "") +
      (inv.tenant_econ_activity
        ? `<div class="muted-center">Act. econ.: ${esc(inv.tenant_econ_activity)}</div>`
        : "") +
      (inv.tenant_contact_phone
        ? `<div class="muted-center">Tel: ${esc(inv.tenant_contact_phone)}</div>`
        : "") +
      (inv.tenant_contact_email
        ? `<div class="muted-center">${esc(inv.tenant_contact_email)}</div>`
        : "") +
      (inv.tenant_sign
        ? `<div class="muted-center italic">${esc(inv.tenant_sign)}</div>`
        : "")
    : "";

  const hasCustomer = !!(
    inv &&
    (customerName ||
      inv.document_number ||
      inv.customer_econ_activity ||
      inv.email ||
      inv.customer_phone ||
      inv.customer_address ||
      inv.customer_birthdate)
  );

  const customerBlock =
    inv && hasCustomer
      ? sectionTitle("Cliente") +
        (customerName ? line(esc(customerName)) : "") +
        (inv.document_number
          ? line(`${esc(customerIdLabel)}: ${esc(inv.document_number)}`)
          : "") +
        (inv.customer_econ_activity
          ? line(`Act. econ.: ${esc(inv.customer_econ_activity)}`)
          : "") +
        (inv.email ? line(esc(inv.email)) : "") +
        (inv.customer_phone ? line(`Tel: ${esc(inv.customer_phone)}`) : "") +
        (inv.customer_address ? line(esc(inv.customer_address)) : "") +
        (inv.customer_birthdate
          ? line(`Nac.: ${fmtDateOnly(inv.customer_birthdate)}`)
          : "")
      : "";

  const saleBlock = inv
    ? sectionTitle("Venta") +
      row(
        "Cond.",
        esc(inv.sale_condition_desc ?? inv.sale_condition ?? "—"),
      ) +
      row("Fecha", fmtDate(inv.sale_date)) +
      row("Factura", fmtDate(inv.invoiced_at)) +
      (inv.due_date ? row("Vence", fmtDateOnly(inv.due_date)) : "") +
      row("Moneda", esc(inv.currency_code ?? "—")) +
      (inv.seller_email ? row("Vend.", esc(inv.seller_email)) : "") +
      (saleId ? `<div class="mono-tiny">ID: ${esc(saleId)}</div>` : "")
    : "";

  const items = inv?.items ?? [];
  const itemsBlock =
    items.length > 0
      ? sectionTitle("Productos") +
        items
          .map((it) => {
            const label = it.description || it.variant_name || "—";
            const codes = [it.sku ? `SKU ${esc(it.sku)}` : ""]
              .filter(Boolean)
              .join(" | ");
            const qtyLine = `${esc(it.quantity)} x ${fmt(it.unit_price, symbol)}`;
            return `<div class="item">
              <div class="item-name">${esc(label)}</div>
              ${codes ? `<div class="item-meta">${codes}</div>` : ""}
              <div class="row"><span class="lbl">${qtyLine}</span><span class="val">${fmt(it.subtotal, symbol)}</span></div>
              ${
                Number(it.tax_amount) > 0
                  ? `<div class="row"><span class="lbl">IVA ${esc(Number(it.tax_rate_percentage ?? 0))}%</span><span class="val">${fmt(it.tax_amount, symbol)}</span></div>`
                  : ""
              }
              <div class="row strong"><span class="lbl">Total</span><span class="val">${fmt(it.total_price, symbol)}</span></div>
            </div>`;
          })
          .join("")
      : "";

  const payments = inv?.payments ?? [];
  const paymentsBlock =
    payments.length > 0
      ? sectionTitle("Pagos") +
        payments
          .map((p) => {
            const sym = p.currency_symbol ?? symbol;
            const label = p.is_points_redemption
              ? `${p.payment_method_name ?? "Puntos"} (${p.points_redeemed} pts)`
              : (p.payment_method_name ?? "Método");
            return row(label, fmt(p.payment_amount, sym));
          })
          .join("")
      : "";

  const pointsHtml =
    pointsRedeemed && pointsRedeemed > 0 && pointsRate && pointsRate > 0
      ? row(
          "Puntos canjeados",
          `-${pointsRedeemed.toLocaleString("es-CR")} pts`,
        )
      : "";

  const loyaltyHtml =
    inv?.points_accumulated && inv.points_accumulated > 0
      ? `<div class="loyalty">+${esc(inv.points_accumulated)} pts ganados</div>`
      : "";

  const totalsBlock = inv
    ? sectionTitle("Resumen") +
      row("Subtotal", fmt(inv.subtotal_amount, symbol)) +
      (inv.total_discount && inv.total_discount > 0
        ? row("Descuentos", `-${fmt(inv.total_discount, symbol)}`)
        : "") +
      row("Impuestos", fmt(inv.tax_amount, symbol)) +
      `<div class="total-row"><span>TOTAL</span><span>${fmt(inv.total_amount, symbol)}</span></div>` +
      (inv.amount_paid && inv.amount_paid > 0
        ? row("Pagado", fmt(inv.amount_paid, symbol))
        : "") +
      (inv.change_amount && inv.change_amount > 0
        ? row("Cambio", fmt(inv.change_amount, symbol))
        : "") +
      pointsHtml
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Factura${saleId ? ` - ${esc(saleId)}` : ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      background: #f3f4f6;
      font-size: 11px;
      line-height: 1.35;
    }
    .ticket {
      width: 74mm;
      margin: 16px auto;
      padding: 4mm 3mm;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .title {
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .subtitle {
      font-size: 11px;
      text-align: center;
      font-weight: 600;
    }
    .muted-center {
      font-size: 10px;
      text-align: center;
      color: #333;
    }
    .italic { font-style: italic; }
    .sect-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      margin: 4px 0 2px;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 2px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      font-size: 11px;
    }
    .row .lbl { color: #000; }
    .row .val { color: #000; text-align: right; white-space: nowrap; }
    .row.strong { font-weight: 700; }
    .line { font-size: 11px; word-break: break-word; }
    .item { margin: 3px 0; padding: 2px 0; border-bottom: 1px dotted #999; }
    .item:last-child { border-bottom: none; }
    .item-name { font-weight: 700; font-size: 11px; word-break: break-word; }
    .item-meta { font-size: 9px; color: #444; }
    .mono-tiny {
      font-size: 9px;
      word-break: break-all;
      margin-top: 2px;
      color: #333;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 2px 0;
      margin: 2px 0;
    }
    .loyalty {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 0;
      border-top: 1px dashed #000;
    }
    .ad {
      text-align: center;
      font-size: 10px;
      font-style: italic;
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px dashed #000;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #000;
    }
    .no-print { text-align: center; padding: 10px; }
    .no-print button {
      background: #4f46e5;
      color: #fff;
      border: 0;
      border-radius: 6px;
      padding: 8px 18px;
      font-size: 13px;
      cursor: pointer;
    }
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      html, body { background: #fff; }
      .ticket {
        width: 80mm;
        margin: 0;
        padding: 2mm 3mm;
        box-shadow: none;
      }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    ${tenantHeader}
    ${tenantHeader ? sep : ""}
    ${customerBlock}
    ${saleBlock}
    ${itemsBlock}
    ${paymentsBlock}
    ${totalsBlock}
    ${loyaltyHtml}
    ${inv?.ad_message ? `<div class="ad">${esc(inv.ad_message)}</div>` : ""}
    <div class="footer">¡Gracias por su compra!</div>
  </div>
  <div class="no-print">
    <button onclick="window.print()">Imprimir</button>
  </div>
</body>
</html>`;
}

export function usePrintInvoice() {
  const printInvoice = useCallback((data: PrintInvoiceData) => {
    const html = buildInvoiceHtml(data);
    const win = window.open("", "_blank", "width=360,height=720");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  }, []);

  return { printInvoice };
}
