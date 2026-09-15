import type { NumericLike } from "@/interfaces/entities/AccountReceivable.interface";

type BadgeTone =
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "secondary"
  | "accent";

const currencyFormatter = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "VES",
  maximumFractionDigits: 2,
});

export const formatCurrency = (value?: NumericLike | null) =>
  currencyFormatter.format(Number(value ?? 0));

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("es-VE") : "—";

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("es-VE", {
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

export const getReceivableStatusTone = (status?: string | null): BadgeTone => {
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

export const getCollectionAlertTone = (
  alertType?: string | null,
): BadgeTone => {
  switch ((alertType ?? "").toLowerCase()) {
    case "overdue collection":
      return "red";
    case "urgent collection":
      return "yellow";
    case "upcoming due date":
      return "blue";
    default:
      return "secondary";
  }
};
