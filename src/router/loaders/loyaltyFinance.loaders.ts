import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { loyaltyFinanceApi } from "@/api/loyaltyFinance.api";
import { withAuthCheck } from "./utils/withAuthCheck";
import { DEFAULT_LOYALTY_INTERVAL } from "@/constants/loyaltyFinance";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { LoyaltyOverview } from "@/interfaces/entities/LoyaltyFinance.interface";

export interface LoyaltyFinancePageLoaderData {
  overview: LoyaltyOverview;
  branches: Branch[];
  currentTenantName: string;
}

const emptyOverview: LoyaltyOverview = {
  interval: DEFAULT_LOYALTY_INTERVAL,
  range_start: new Date().toISOString(),
  bucket_unit: "day",
  config: null,
  totals: {
    active_points: 0,
    redeemed_points: 0,
    lifetime_points: 0,
    expired_points: 0,
    customers_with_points: 0,
    active_value: 0,
    redeemed_value: 0,
    lifetime_value: 0,
    expired_value: 0,
  },
  growth: [],
  top_customers: [],
};

export const getLoyaltyFinancePageData =
  async (): Promise<LoyaltyFinancePageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const currentTenantName =
        currentUser?.tenant?.tenant_name ?? "Mi tenant";
      const tenantId = currentUser?.tenant?.tenant_id ?? "";

      const [overview, branchRes] = await Promise.all([
        loyaltyFinanceApi
          .getOverview(DEFAULT_LOYALTY_INTERVAL)
          .catch(() => emptyOverview),
        tenantId
          ? branchApi
              .listByTenant(tenantId, 1, 200)
              .catch(() => ({ branches: [] as Branch[] }))
          : Promise.resolve({ branches: [] as Branch[] }),
      ]);

      return {
        overview,
        branches: branchRes.branches ?? [],
        currentTenantName,
      };
    });
