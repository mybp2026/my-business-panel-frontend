import { financesApi } from "@/api/finances.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { withAuthCheck } from "./utils/withAuthCheck";
import { DISPLAY_CURRENCIES } from "@/constants/currencies";
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
      const [cashFlow, projections, exchangeRates] = await Promise.all([
        financesApi.getCashFlow({ groupBy: "daily" }).catch(() => emptyCashFlow),
        financesApi.getCashFlowProjections().catch(() => emptyProjections),
        exchangeRateApi.getAll().catch(() => [] as ExchangeRate[]),
      ]);

      return {
        cashFlow,
        projections,
        currencies: DISPLAY_CURRENCIES,
        exchangeRates,
      };
    });
