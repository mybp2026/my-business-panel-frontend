import { authApi } from "@/api/auth.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { currencyApi } from "@/api/currency.api";

import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

export interface FnzIvaPageLoaderData {
  tenantId: string;
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
}

async function fetchFnzIvaPageData(): Promise<FnzIvaPageLoaderData> {
  const user = await authApi.getCurrentUser();
  const tenantId = user?.tenant?.tenant_id ?? "";

  const [currencies, exchangeRates] = await Promise.all([
    currencyApi.getAll(),
    exchangeRateApi.getAll(),
  ]);

  return { tenantId, currencies, exchangeRates };
}

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getFnzIvaPageData = () => ({
  data: fetchFnzIvaPageData(),
});
