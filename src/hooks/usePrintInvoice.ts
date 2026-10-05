import { useCallback } from "react";
import type { InvoiceInfo } from "@/interfaces/entities/Sale.interface";
import { customerDisplayName, isLegalPerson } from "@/utils/customerInvoice";

export interface PrintInvoiceData {
  saleId?: string | null;
  digitalInvoice: InvoiceInfo | null;
  pointsRedeemed?: number;
  pointsRate?: number;
}

const fmt = (value: number | null | undefined, symbol: string) =>
  `${symbol} ${Number(value ?? 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// FECHA y HORA del modelo SENIAT: 12-09-2026 / 15:41.
const fmtDateDashed = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
};

const fmtTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

const fmtDateOnly = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("es-VE") : "—";

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

// "J" + "50585875-0" -> "J-50585875-0". Si el documento ya trae la letra
// ("J-50585875-0") no se duplica.
const formatDocument = (code?: string | null, number?: string | null) => {
  const value = (number ?? "").trim();
  if (!value) return "";
  if (!code || /^[A-Za-z]-/.test(value)) return value;
  return `${code}-${value}`;
};

// Etiqueta del documento del comprador: RIF para J/G/C, C.I. para V/E.
const customerDocLabel = (code?: string | null) => {
  if (isLegalPerson(code)) return "RIF";
  if (code?.toUpperCase() === "P") return "PASAPORTE";
  return "C.I.";
};

const paymentMethodLabels: Record<string, string> = {
  cash: "EFECTIVO",
  debit_card: "TARJETA DÉBITO",
  credit_card: "TARJETA CRÉDITO",
  loyalty_points: "PUNTOS",
  credit: "CRÉDITO",
};

const paymentLabel = (name?: string | null) => {
  if (!name) return "PAGO";
  return paymentMethodLabels[name] ?? name.replace(/_/g, " ").toUpperCase();
};

export function buildInvoiceHtml(data: PrintInvoiceData): string {
  const { saleId, digitalInvoice, pointsRedeemed, pointsRate } = data;
  const inv = digitalInvoice;
  const symbol = inv?.currency_symbol ?? "Bs.";

  // Fila etiqueta/valor (valor a la derecha).
  const row = (label: string, value: string, cls = "") =>
    `<div class="row ${cls}"><span class="lbl">${esc(label)}</span><span class="val">${value}</span></div>`;

  const field = (label: string, value: string) =>
    `<div class="field"><span class="field-lbl">${esc(label)}:</span> ${value}</div>`;

  const sep = `<div class="sep"></div>`;

  // ---- Encabezado: SENIAT + datos del vendedor --------------------------
  const tenantIdLabel =
    inv?.tenant_identification_type_code ||
    inv?.tenant_identification_type_name ||
    "";
  const sellerRif = formatDocument(
    inv?.tenant_identification_type_code,
    inv?.tenant_identification,
  );

  const sellerBlock = inv
    ? `<div class="seniat">SENIAT</div>` +
      (inv.tenant_name
        ? `<div class="title">${esc(inv.tenant_name)}</div>`
        : "") +
      (sellerRif
        ? `<div class="center strong">RIF ${esc(sellerRif)}</div>`
        : inv.tenant_identification
          ? `<div class="center strong">${esc(tenantIdLabel)} ${esc(inv.tenant_identification)}</div>`
          : "") +
      (inv.branch_address
        ? `<div class="center">${esc(inv.branch_address)}</div>`
        : "") +
      (inv.branch_name
        ? `<div class="muted-center">${esc(inv.branch_name)}</div>`
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

  // ---- Datos del comprador (a la izquierda) -----------------------------
  const buyerName = inv ? customerDisplayName(inv) : "";
  const buyerDoc = formatDocument(
    inv?.customer_identification_type_code,
    inv?.document_number,
  );

  const buyerBlock = inv
    ? (buyerName ? field("CLIENTE", esc(buyerName)) : "") +
      (buyerDoc
        ? field(
            customerDocLabel(inv.customer_identification_type_code),
            esc(buyerDoc),
          )
        : "") +
      (inv.customer_address
        ? field("DIRECCIÓN", esc(inv.customer_address))
        : "") +
      (inv.customer_econ_activity
        ? `<div class="meta">Act. econ.: ${esc(inv.customer_econ_activity)}</div>`
        : "") +
      (inv.email ? `<div class="meta">${esc(inv.email)}</div>` : "") +
      (inv.customer_phone
        ? `<div class="meta">Tel: ${esc(inv.customer_phone)}</div>`
        : "") +
      (inv.customer_birthdate
        ? `<div class="meta">Nac.: ${fmtDateOnly(inv.customer_birthdate)}</div>`
        : "")
    : "";

  // ---- Numero, fecha y hora ---------------------------------------------
  // invoice_number es null en facturas anteriores a la migracion 040: se
  // omite la linea en vez de imprimir un numero inventado.
  const numberBlock = inv
    ? (inv.seller_email ? field("Usuario", esc(inv.seller_email)) : "") +
      (inv.invoice_number
        ? row("FACTURA:", `<strong>${esc(inv.invoice_number)}</strong>`)
        : "") +
      row("FECHA: " + fmtDateDashed(inv.invoiced_at), "HORA: " + fmtTime(inv.invoiced_at))
    : "";

  // Datos propios de mybp que el modelo fiscal no tiene.
  const saleExtras = inv
    ? row("Cond.", esc(inv.sale_condition_desc ?? inv.sale_condition ?? "—")) +
      (fmtDateDashed(inv.sale_date) !== fmtDateDashed(inv.invoiced_at)
        ? row("Fecha venta", fmtDateDashed(inv.sale_date))
        : "") +
      (inv.due_date ? row("Vence", fmtDateOnly(inv.due_date)) : "") +
      row("Moneda", esc(inv.currency_code ?? "—")) +
      (saleId ? `<div class="mono-tiny">ID: ${esc(saleId)}</div>` : "")
    : "";

  // ---- Items: "cant x unitario" arriba, nombre + total a la derecha -------
  const items = inv?.items ?? [];
  const itemsBlock = items
    .map((it) => {
      const label = it.description || it.variant_name || "—";
      const qtyLine = `${esc(it.quantity)}x ${fmt(it.unit_price, symbol)}`;
      return `<div class="item">
        <div class="qty-line">${qtyLine}</div>
        <div class="row"><span class="item-name">${esc(label)}</span><span class="val">${fmt(it.subtotal, symbol)}</span></div>
        ${it.sku ? `<div class="item-meta">SKU ${esc(it.sku)}</div>` : ""}
        ${
          Number(it.tax_amount) > 0
            ? `<div class="row item-meta"><span class="lbl">IVA ${esc(Number(it.tax_rate_percentage ?? 0))}%</span><span class="val">${fmt(it.tax_amount, symbol)}</span></div>`
            : ""
        }
      </div>`;
    })
    .join("");

  // ---- Totales: base imponible e IVA por tasa -------------------------------
  // Donde el modelo fiscal muestra EXENTO, mybp muestra BI + IVA por tasa.
  const byRate = new Map<number, { base: number; tax: number }>();
  for (const it of items) {
    const rate = Number(it.tax_rate_percentage ?? 0);
    const acc = byRate.get(rate) ?? { base: 0, tax: 0 };
    acc.base += Number(it.subtotal ?? 0);
    acc.tax += Number(it.tax_amount ?? 0);
    byRate.set(rate, acc);
  }
  const taxRows = [...byRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(
      ([rate, v]) =>
        row(`BI ${rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}%`, fmt(v.base, symbol)) +
        (rate > 0
          ? row(
              `IVA ${rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}%`,
              fmt(v.tax, symbol),
            )
          : ""),
    )
    .join("");

  const pointsHtml =
    pointsRedeemed && pointsRedeemed > 0 && pointsRate && pointsRate > 0
      ? row(
          "Puntos canjeados",
          `-${pointsRedeemed.toLocaleString("es-VE")} pts`,
        )
      : "";

  const payments = inv?.payments ?? [];
  const paymentsBlock = payments
    .map((p) => {
      const sym = p.currency_symbol ?? symbol;
      const label = p.is_points_redemption
        ? `${paymentLabel(p.payment_method_name)} (${p.points_redeemed} pts)`
        : paymentLabel(p.payment_method_name);
      return row(label, fmt(p.payment_amount, sym));
    })
    .join("");

  const totalsBlock = inv
    ? taxRows +
      (inv.total_discount && inv.total_discount > 0
        ? row("Descuentos", `-${fmt(inv.total_discount, symbol)}`)
        : "") +
      `<div class="total-row"><span>TOTAL</span><span>${fmt(inv.total_amount, symbol)}</span></div>` +
      paymentsBlock +
      (inv.amount_paid && inv.amount_paid > 0
        ? row("Pagado", fmt(inv.amount_paid, symbol))
        : "") +
      (inv.change_amount && inv.change_amount > 0
        ? row("Cambio", fmt(inv.change_amount, symbol))
        : "") +
      pointsHtml
    : "";

  const loyaltyHtml =
    inv?.points_accumulated && inv.points_accumulated > 0
      ? `<div class="loyalty">+${esc(inv.points_accumulated)} pts ganados</div>`
      : "";

  const title = inv?.invoice_number
    ? `Factura ${esc(inv.invoice_number)}`
    : `Factura${saleId ? ` - ${esc(saleId)}` : ""}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
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
    .seniat {
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 1px;
    }
    .title {
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      margin: 1px 0;
    }
    .center { text-align: center; font-size: 11px; word-break: break-word; }
    .strong { font-weight: 700; }
    .muted-center {
      font-size: 9px;
      text-align: center;
      color: #444;
    }
    .italic { font-style: italic; }
    .doc-title {
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      margin: 5px 0 3px;
    }
    .field { font-size: 11px; word-break: break-word; }
    .field-lbl { font-weight: 700; }
    .meta { font-size: 9px; color: #444; word-break: break-word; }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      font-size: 11px;
    }
    .row .lbl { color: #000; }
    .row .val { color: #000; text-align: right; white-space: nowrap; }
    .sep { border-top: 1px dashed #000; margin: 4px 0; }
    .item { margin: 3px 0; }
    .qty-line { font-size: 11px; }
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
      margin: 3px 0;
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
    ${sellerBlock}
    ${inv ? `<div class="doc-title">FACTURA</div>` : ""}
    ${buyerBlock}
    ${numberBlock}
    ${saleExtras}
    ${itemsBlock ? sep + itemsBlock + sep : ""}
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
