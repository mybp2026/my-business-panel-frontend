import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { financesApi } from "@/api/finances.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { withAuthCheck } from "./utils/withAuthCheck";
import { DISPLAY_CURRENCIES } from "@/constants/currencies";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type {
  CashFlowData,
  CashFlowProjectionsData,
} from "@/interfaces/entities/CashFlow.interface";

export interface CashFlowPageLoaderData {
  cashFlow: CashFlowData;
  projections: CashFlowProjectionsData;
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  branches: Branch[];
}

const emptyCashFlow: CashFlowData = {
  start_date: "",
  end_date: "",
  group_by: "daily",
  summary: [],
  buckets: [],
  available_cash: [],
};

const emptyProjections: CashFlowProjectionsData = {
  projections: [],
};

export const getCashFlowPageData =
  async (): Promise<CashFlowPageLoaderData> =>
    withAuthCheck(async () => {
      const user = await authApi.getCurrentUser();
      const tenantId = user?.tenant?.tenant_id ?? "";

      const [cashFlow, projections, exchangeRates, branchRes] =
        await Promise.all([
          financesApi
            .getCashFlow({ groupBy: "daily" })
            .catch(() => emptyCashFlow),
          financesApi.getCashFlowProjections().catch(() => emptyProjections),
          exchangeRateApi.getAll().catch(() => [] as ExchangeRate[]),
          tenantId
            ? branchApi
                .listByTenant(tenantId, 1, 200)
                .catch(() => ({ branches: [] as Branch[] }))
            : Promise.resolve({ branches: [] as Branch[] }),
        ]);

      return {
        cashFlow,
        projections,
        currencies: DISPLAY_CURRENCIES,
        exchangeRates,
        branches: branchRes.branches ?? [],
      };
    });
