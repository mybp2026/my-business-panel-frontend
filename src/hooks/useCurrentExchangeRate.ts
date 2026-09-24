import { useEffect, useState } from "react";

import { exchangeRateApi } from "@/api/exchangeRate.api";

/** Tasa USD -> Bs. vigente del tenant, para mostrar el equivalente en
 *  dolares de montos que persisten en bolivares (tablas de ventas, CxC,
 *  notas de credito/debito, etc.). Null mientras carga o si no hay tasa. */
export function useCurrentExchangeRate(): number | null {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    exchangeRateApi
      .getLatest()
      .then((result) => {
        if (cancelled) return;
        const parsed = Number(result?.rate ?? 0);
        setRate(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
      })
      .catch(() => {
        if (!cancelled) setRate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return rate;
}
