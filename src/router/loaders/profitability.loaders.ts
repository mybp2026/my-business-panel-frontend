import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { profitabilityApi } from "@/api/profitability.api";
import { withAuthCheck } from "./utils/withAuthCheck";
import { DISPLAY_CURRENCIES } from "@/constants/currencies";
import { DEFAULT_PROFITABILITY_INTERVAL } from "@/constants/profitability";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type { ProfitabilityRawData } from "@/interfaces/entities/Profitability.interface";

export interface ProfitabilityPageLoaderData {
  raw: ProfitabilityRawData;
  branches: Branch[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  currentTenantName: string;
}

const emptyRaw: ProfitabilityRawData = {
  interval: DEFAULT_PROFITABILITY_INTERVAL,
  range_start: new Date().toISOString(),
  bucket_unit: "hour",
  branches: [],
  sales: [],
  returns: [],
  expenses: [],
};

export const getProfitabilityPageData =
  async (): Promise<ProfitabilityPageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const currentTenantName =
        currentUser?.tenant?.tenant_name ?? "Mi tenant";
      const tenantId = currentUser?.tenant?.tenant_id ?? "";

      const [raw, branchRes, currencies, exchangeRates] = await Promise.all([
        profitabilityApi
          .getProfitability(DEFAULT_PROFITABILITY_INTERVAL)
          .catch(() => emptyRaw),
        tenantId
          ? branchApi
              .listByTenant(tenantId, 1, 200)
              .catch(() => ({ branches: [] as Branch[] }))
          : Promise.resolve({ branches: [] as Branch[] }),
        Promise.resolve(DISPLAY_CURRENCIES),
        exchangeRateApi.getAll().catch(() => [] as ExchangeRate[]),
      ]);

      return {
        raw,
        branches: branchRes.branches ?? [],
        currencies,
        exchangeRates,
        currentTenantName,
      };
    });
