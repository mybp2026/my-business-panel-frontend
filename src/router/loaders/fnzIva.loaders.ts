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

export async function getFnzIvaPageData(): Promise<FnzIvaPageLoaderData> {
  const user = await authApi.getCurrentUser();
  const tenantId = user?.tenant?.tenant_id ?? "";

  const [currencies, exchangeRates] = await Promise.all([
    currencyApi.getAll(),
    exchangeRateApi.getAll(),
  ]);

  return { tenantId, currencies, exchangeRates };
}
