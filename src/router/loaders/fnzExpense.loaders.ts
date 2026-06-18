import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { financesApi } from "@/api/finances.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { currencyApi } from "@/api/currency.api";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { ExpenseCategory } from "@/interfaces/entities/FnzExpense.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

export interface FnzExpensePageLoaderData {
  tenantId: string;
  branches: Branch[];
  categories: ExpenseCategory[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
}

export async function getFnzExpensePageData(): Promise<FnzExpensePageLoaderData> {
  const user = await authApi.getCurrentUser();
  const tenantId = user?.tenant?.tenant_id ?? "";

  const [branchRes, categories, currencies, exchangeRates] = await Promise.all([
    tenantId ? branchApi.listByTenant(tenantId, 1, 200) : Promise.resolve({ branches: [], total: 0, page: 1, limit: 200 }),
    tenantId ? financesApi.getCategories(tenantId) : Promise.resolve([]),
    currencyApi.getAll(),
    exchangeRateApi.getAll(),
  ]);

  return {
    tenantId,
    branches: branchRes.branches,
    categories,
    currencies,
    exchangeRates,
  };
}
