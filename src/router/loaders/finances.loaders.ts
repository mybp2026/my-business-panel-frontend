import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { financesApi } from "@/api/finances.api";
import { withAuthCheck } from "./utils/withAuthCheck";
import { DISPLAY_CURRENCIES } from "@/constants/currencies";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type { AccountsOverviewData } from "@/interfaces/entities/Finances.interface";

export interface AccountsOverviewPageLoaderData {
  overview: AccountsOverviewData;
  branches: Branch[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  currentTenantName: string;
  isSuperuser: boolean;
}

export const getAccountsOverviewPageData =
  async (): Promise<AccountsOverviewPageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const isSuperuser = currentUser?.role?.role_hierarchy === 1;
      const currentTenantName =
        currentUser?.tenant?.tenant_name ?? "Mi tenant";
      const tenantId = currentUser?.tenant?.tenant_id ?? "";

      const [overview, branchRes, currencies, exchangeRates] =
        await Promise.all([
          financesApi
            .getAccountsOverview()
            .catch(
              () =>
                ({
                  payables: [],
                  receivables: [],
                  payables_alert_config: null,
                  receivables_alert_config: null,
                }) as AccountsOverviewData,
            ),
          tenantId
            ? branchApi
                .listByTenant(tenantId, 1, 200)
                .catch(() => ({ branches: [] as Branch[] }))
            : Promise.resolve({ branches: [] as Branch[] }),
          Promise.resolve(DISPLAY_CURRENCIES),
          exchangeRateApi.getAll().catch(() => [] as ExchangeRate[]),
        ]);

      return {
        overview,
        branches: branchRes.branches ?? [],
        currencies,
        exchangeRates,
        currentTenantName,
        isSuperuser,
      };
    });
