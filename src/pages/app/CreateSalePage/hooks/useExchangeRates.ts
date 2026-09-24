import { useEffect, useMemo, useState } from "react";

import { exchangeRateApi } from "@/api/exchangeRate.api";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

import { VES_CURRENCY_ID } from "../create-sale.constants";
import type { PaymentSplit } from "../create-sale.types";

export interface UseServerExchangeRateResult {
  serverExchangeRate: ExchangeRate | null;
  effectiveExchangeRate: number;
}

// Exchange rate (VES <-> USD): fetched from the server on mount, then
// overridable locally for the current cash-session lifetime. Per spec, the
// override does not persist to the database -- closing the session loses it.
export function useServerExchangeRate(): UseServerExchangeRateResult {
  const [serverExchangeRate, setServerExchangeRate] =
    useState<ExchangeRate | null>(null);

  useEffect(() => {
    let cancelled = false;
    exchangeRateApi
      .getLatest()
      .then((rate) => {
        if (!cancelled) setServerExchangeRate(rate ?? null);
      })
      .catch(() => {
        if (!cancelled) setServerExchangeRate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Effective rate: cashier override wins if it parses to a positive number;
  // otherwise the server rate is used.
  const effectiveExchangeRate = useMemo(() => {
    const serverRate = Number(serverExchangeRate?.rate ?? 0);
    return Number.isFinite(serverRate) && serverRate > 0 ? serverRate : 0;
  }, [serverExchangeRate]);

  return { serverExchangeRate, effectiveExchangeRate };
}

// Exchange rates for each payment split, keyed by split.id. We load rates to
// convert each split's currency to CRC (as a pivot).
export function useSplitExchangeRates(
  paymentSplits: PaymentSplit[],
): Record<string, ExchangeRate | null> {
  const [exchangeRatesForSplits, setExchangeRatesForSplits] = useState<
    Record<string, ExchangeRate | null>
  >({});

  const splitsKey = paymentSplits.map((s) => `${s.id}:${s.currencyId}`).join("|");

  useEffect(() => {
    let cancelled = false;
    const loadRatesForSplits = async () => {
      const rates: Record<string, ExchangeRate | null> = {};
      for (const split of paymentSplits) {
        if (split.currencyId === VES_CURRENCY_ID) {
          rates[split.id] = null; // CRC doesn't need conversion to itself
        } else {
          try {
            const rate = await exchangeRateApi.getLatest();
            rates[split.id] = rate ?? null;
          } catch {
            rates[split.id] = null;
          }
        }
      }
      if (!cancelled) setExchangeRatesForSplits(rates);
    };
    loadRatesForSplits();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitsKey]);

  return exchangeRatesForSplits;
}
