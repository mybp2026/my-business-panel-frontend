import { useMemo } from "react";

import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

import { round2, VES_CURRENCY_ID } from "../create-sale.constants";
import type { PaymentSplit } from "../create-sale.types";

interface UsePaymentTotalsParams {
  paymentSplits: PaymentSplit[];
  isPartialPayment: boolean;
  currencyId: number;
  targetPayment: number;
  serverExchangeRate: ExchangeRate | null;
  effectiveExchangeRate: number;
  exchangeRatesForSplits: Record<string, ExchangeRate | null>;
}

export interface UsePaymentTotalsResult {
  splitTotalInSaleCurrency: number;
  paymentBalance: number;
  paymentCurrenciesUsed: number[];
}

// Convert each split to the sale currency, then sum, using CRC (Bs.) as the
// pivot currency between the split's own currency and the sale currency.
export function usePaymentTotals({
  paymentSplits,
  isPartialPayment,
  currencyId,
  targetPayment,
  serverExchangeRate,
  effectiveExchangeRate,
  exchangeRatesForSplits,
}: UsePaymentTotalsParams): UsePaymentTotalsResult {
  const splitTotalInSaleCurrency = useMemo(() => {
    return paymentSplits.reduce((sum, s) => {
      const amount = Number(parseFloat(s.amount) || 0);
      if (amount === 0) return sum;

      // If split currency matches sale currency, add directly
      if (s.currencyId === currencyId) {
        return round2(sum + amount);
      }

      // Convert split to CRC first
      let amountInCrc = amount;
      if (s.currencyId !== VES_CURRENCY_ID) {
        const rateToCrc = exchangeRatesForSplits[s.id];
        if (!rateToCrc) return sum; // No rate available, skip this split
        amountInCrc = round2(amount * Number(rateToCrc.rate));
      }

      // Now convert from CRC to sale currency if needed
      if (currencyId === VES_CURRENCY_ID) {
        return round2(sum + amountInCrc);
      }

      // Sale currency is not CRC, so convert CRC to sale currency
      if (!serverExchangeRate || !effectiveExchangeRate) return sum;
      const amountInSaleCurrency = round2(amountInCrc / effectiveExchangeRate);
      return round2(sum + amountInSaleCurrency);
    }, 0);
  }, [
    paymentSplits,
    currencyId,
    exchangeRatesForSplits,
    serverExchangeRate,
    effectiveExchangeRate,
  ]);

  const paymentBalance = round2(targetPayment - splitTotalInSaleCurrency);

  const paymentCurrenciesUsed = useMemo(() => {
    if (!isPartialPayment) return [];
    return Array.from(new Set(paymentSplits.map((s) => s.currencyId)));
  }, [isPartialPayment, paymentSplits]);

  return { splitTotalInSaleCurrency, paymentBalance, paymentCurrenciesUsed };
}
