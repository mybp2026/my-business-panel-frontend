import type { NumericLike } from "@/interfaces/entities/Purchase.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

type BadgeTone =
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "secondary"
  | "accent";

// --- Generic currency utilities ---

export function formatInCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency.currency_code,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function convertAmount(
  raw: string | number,
  fromCurrencyId: number,
  toCurrencyId: number,
  rates: ExchangeRate[],
): number {
  const amount = Number(raw);
  if (fromCurrencyId === toCurrencyId || isNaN(amount)) return amount;
  const rate = rates.find(
    (r) =>
      r.from_currency_id === fromCurrencyId &&
      r.to_currency_id === toCurrencyId,
  );
  return rate ? amount * Number(rate.rate) : amount;
}

// Backward-compatible CRC formatter — delegates to formatInCurrency
const CRC_CURRENCY: Currency = {
  currency_id: 1,
  currency_code: "CRC",
  currency_name: "Colón Costarricense",
  symbol: "₡",
};

export const formatCurrency = (value?: NumericLike | null) =>
  formatInCurrency(Number(value ?? 0), CRC_CURRENCY);

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("es-CR") : "—";

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

export const formatPaymentMethodName = (value?: string | null) =>
  value
    ? value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "—";

export const getOrderStatusTone = (status?: string | null): BadgeTone => {
  switch ((status ?? "").toLowerCase()) {
    case "pending":
      return "yellow";
    case "shipped":
      return "blue";
    case "delivered":
      return "green";
    case "cancelled":
      return "red";
    default:
      return "secondary";
  }
};

export const getPayableStatusTone = (status?: string | null): BadgeTone => {
  switch ((status ?? "").toLowerCase()) {
    case "pending":
      return "yellow";
    case "partial paid":
      return "blue";
    case "paid":
      return "green";
    case "overdue":
      return "red";
    default:
      return "secondary";
  }
};

export const getAlertTone = (alertType?: string | null): BadgeTone => {
  switch ((alertType ?? "").toLowerCase()) {
    case "overdue payment":
      return "red";
    case "urgent payment":
      return "yellow";
    case "upcoming due date":
      return "blue";
    default:
      return "secondary";
  }
};

export const getNextOrderStatuses = (statusId: number) => {
  switch (statusId) {
    case 1:
      return [2, 4];
    case 2:
      return [3, 4];
    default:
      return [];
  }
};

export const getStatusLabelById = (statusId: number) => {
  switch (statusId) {
    case 2:
      return "Marcar como enviada";
    case 3:
      return "Marcar como entregada";
    case 4:
      return "Cancelar orden";
    default:
      return "Actualizar estado";
  }
};
