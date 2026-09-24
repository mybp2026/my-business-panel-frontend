export interface LoyaltyPointsSectionProps {
  step: "lookup" | "items";
  loyaltyActive: boolean;
  availablePoints: number;
  pointsRate: number;
  maxPointsCrcValue: number;
  convertCrcToSaleCurrency: (amount: number) => number;
  currencySymbol: string;
  usePoints: boolean;
  pointsCoveredDisplay: number;
  pointsToRedeem: number;
  totalAmount: number;
  onToggleUsePoints: (checked: boolean) => void;
}
