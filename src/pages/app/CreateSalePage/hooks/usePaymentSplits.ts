import { useEffect, useState } from "react";

import { currencies, paymentMethods } from "@/constants/payment-methods";

import { round2, VES_CURRENCY_ID } from "../create-sale.constants";
import type { PaymentSplit } from "../create-sale.types";

export const defaultPaymentMethod =
  paymentMethods.find((m) => m.code === "debit_card") ?? paymentMethods[0];
export const defaultCurrency = currencies[0];

const initialSplit = (): PaymentSplit => ({
  id: "split-1",
  methodId: defaultPaymentMethod.value,
  amount: "",
  currencyId: defaultCurrency.value,
});

interface UsePaymentSplitsParams {
  totalAmountDisplay: number;
  targetPayment: number;
  isWalkInSale: boolean;
}

export interface UsePaymentSplitsResult {
  paymentSplits: PaymentSplit[];
  setPaymentSplits: React.Dispatch<React.SetStateAction<PaymentSplit[]>>;
  isPartialPayment: boolean;
  setIsPartialPayment: (value: boolean) => void;
  updatePaymentSplit: (
    id: string,
    field: keyof PaymentSplit,
    value: string | number,
  ) => void;
  fillRemainder: (id: string) => void;
  resetPaymentSplits: () => void;
}

// Owns payment-split state and mutations only. Money totals that depend on
// exchange rates (splitTotalInSaleCurrency, paymentBalance) are computed at
// the page level from this hook's `paymentSplits` plus the exchange-rate
// hooks, to avoid a circular dependency (rates are fetched per split id, so
// they need this hook's output as their input).
export function usePaymentSplits({
  totalAmountDisplay,
  targetPayment,
  isWalkInSale,
}: UsePaymentSplitsParams): UsePaymentSplitsResult {
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    initialSplit(),
  ]);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [singlePaymentManuallyEdited, setSinglePaymentManuallyEdited] =
    useState(false);

  useEffect(() => {
    if (!isPartialPayment && !singlePaymentManuallyEdited) {
      setPaymentSplits((p) => [
        { ...p[0], amount: String(totalAmountDisplay) },
      ]);
    }
  }, [isPartialPayment, singlePaymentManuallyEdited, totalAmountDisplay]);

  useEffect(() => {
    if (isPartialPayment) {
      setSinglePaymentManuallyEdited(false);
      setPaymentSplits(
        paymentMethods
          .filter((m) => !(m.code === "loyalty_points" && isWalkInSale))
          .map((m) => ({
            id: `split-${m.value}`,
            methodId: m.value,
            amount: "",
            currencyId: VES_CURRENCY_ID,
          })),
      );
      return;
    }
    setSinglePaymentManuallyEdited(false);
    setPaymentSplits((prev) => [
      {
        id: prev[0]?.id ?? "split-1",
        methodId: prev[0]?.methodId ?? defaultPaymentMethod.value,
        amount: String(totalAmountDisplay),
        currencyId: prev[0]?.currencyId ?? defaultCurrency.value,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPartialPayment]);

  const updatePaymentSplit = (
    id: string,
    field: keyof PaymentSplit,
    value: string | number,
  ) => {
    if (!isPartialPayment && field === "amount") {
      setSinglePaymentManuallyEdited(true);
    }
    setPaymentSplits((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const fillRemainder = (id: string) => {
    const others = paymentSplits
      .filter((s) => s.id !== id)
      .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const fill = round2(Math.max(targetPayment - others, 0));
    updatePaymentSplit(id, "amount", String(fill));
  };

  const resetPaymentSplits = () => {
    setPaymentSplits([initialSplit()]);
    setSinglePaymentManuallyEdited(false);
  };

  return {
    paymentSplits,
    setPaymentSplits,
    isPartialPayment,
    setIsPartialPayment,
    updatePaymentSplit,
    fillRemainder,
    resetPaymentSplits,
  };
}
