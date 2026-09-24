import type { PaymentSplit } from "../../create-sale.types";

export interface PaymentSplitsSectionProps {
  step: "lookup" | "items";
  paymentSplits: PaymentSplit[];
  isPartialPayment: boolean;
  onTogglePartialPayment: (value: boolean) => void;
  usePoints: boolean;
  pointsToRedeem: number;
  pointsRate: number;
  availablePoints: number;
  paymentOptions: { value: string; label: string }[];
  onUpdateSplit: (
    id: string,
    field: keyof PaymentSplit,
    value: string | number,
  ) => void;
  onFillRemainder: (id: string) => void;
  splitTotalInSaleCurrency: number;
  targetPayment: number;
  paymentBalance: number;
  paymentCurrenciesUsed: number[];
  currencySymbol: string;
}
