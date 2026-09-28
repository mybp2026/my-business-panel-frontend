import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { financesApi } from "@/api/finances.api";
import { currencyApi } from "@/api/currency.api";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExpenseCategory } from "@/interfaces/entities/FnzExpense.interface";

export interface PosExpensePageLoaderData {
  branches: Branch[];
  categories: ExpenseCategory[];
  currencies: Currency[];
  tenantId: string;
}

const fetchPosExpensePageData =
  async (): Promise<PosExpensePageLoaderData> => {
    const user = await authApi.getCurrentUser();
    const tenantId = user?.tenant?.tenant_id ?? "";

    const [branchRes, allCategories, currencies] = await Promise.all([
      branchApi.listByTenant(tenantId, 1, 200),
      tenantId ? financesApi.getCategories(tenantId) : Promise.resolve([]),
      currencyApi.getAll(),
    ]);

    return {
      branches: branchRes.branches,
      categories: allCategories.filter((c) => c.is_active),
      currencies,
      tenantId,
    };
  };

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getPosExpensePageData = () => ({
  data: fetchPosExpensePageData(),
});
