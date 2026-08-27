import { authApi } from "@/api/auth.api";
import { promotionApi } from "@/api/promotion.api";
import { royaltyApi } from "@/api/royalty.api";
import { currencyApi } from "@/api/currency.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { branchApi } from "@/api/branch.api";
import { DEFAULT_PROMO_INTERVAL } from "@/constants/promotion";
import type { PromoAnalyticsRow, PromoInterval } from "@/interfaces/entities/Promotion.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { RoyaltyAnalytics } from "@/interfaces/entities/RoyaltyAnalytics.interface";

export interface PromotionsAnalyticsLoaderData {
  rows: PromoAnalyticsRow[];
  royalty: RoyaltyAnalytics | null;
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  branches: Branch[];
  tenantId: string;
  interval: PromoInterval;
}

export async function getPromotionsAnalyticsPageData(): Promise<PromotionsAnalyticsLoaderData> {
  const user = await authApi.getCurrentUser();
  const tenantId = user?.tenant?.tenant_id ?? "";
  const interval = DEFAULT_PROMO_INTERVAL;

  const [rows, royalty, currencies, exchangeRates, branchRes] =
    await Promise.all([
      tenantId
        ? promotionApi.getAnalytics(tenantId, interval)
        : Promise.resolve([]),
      tenantId
        ? royaltyApi.getAnalytics(tenantId, interval).catch(() => null)
        : Promise.resolve(null),
      currencyApi.getAll(),
      exchangeRateApi.getAll(),
      tenantId
        ? branchApi.listByTenant(tenantId, 1, 200)
        : Promise.resolve({ branches: [], total: 0, page: 1, limit: 200 }),
    ]);

  return {
    rows,
    royalty,
    currencies,
    exchangeRates,
    branches: branchRes.branches,
    tenantId,
    interval,
  };
}
