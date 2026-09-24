export interface CreditApartadoSectionProps {
  step: "lookup" | "items";
  isCredit: boolean;
  isApartado: boolean;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  paymentBalance: number;
  currencySymbol: string;
  totalAmountDisplay: number;
  apartadoAmountDisplay: number;
  apartadoBalance: number;
}
