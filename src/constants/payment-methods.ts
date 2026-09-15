export interface PaymentMethodOption {
  value: number;
  label: string;
  code:
    | "cash"
    | "debit_card"
    | "credit_card"
    | "loyalty_points"
    | "bank_transfer";
}

export const paymentMethods: PaymentMethodOption[] = [
  { value: 1, label: "Efectivo", code: "cash" },
  { value: 2, label: "Tarjeta de débito", code: "debit_card" },
  { value: 3, label: "Tarjeta de crédito", code: "credit_card" },
  { value: 4, label: "Transferencia bancaria", code: "bank_transfer" },
  { value: 5, label: "Puntos de fidelidad", code: "loyalty_points" },
];

export const refundStatuses = [
  { value: 1, label: "Pendiente" },
  { value: 2, label: "Rechazado" },
  { value: 3, label: "Procesado" },
];

export const currencies = [
  { value: 1, label: "Bolívar (VES)", code: "VES", symbol: "Bs." },
  { value: 2, label: "Dólar Estadounidense (USD)", code: "USD", symbol: "$" },
  { value: 3, label: "Euro (EUR)", code: "EUR", symbol: "€" },
];
