import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { posExpenseApi } from "@/api/posExpense.api";
import { fnzExpenseApi } from "@/api/fnzExpense.api";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { ExpenseType } from "@/interfaces/entities/PosExpense.interface";
import type { ExpenseCategory } from "@/interfaces/entities/FnzExpense.interface";

export interface PosExpensePageLoaderData {
  branches: Branch[];
  expenseTypes: ExpenseType[];
  variableCategories: ExpenseCategory[];
  tenantId: string;
}

export const getPosExpensePageData =
  async (): Promise<PosExpensePageLoaderData> => {
    const user = await authApi.getCurrentUser();
    const tenantId = user?.tenant?.tenant_id ?? "";

    const [branchRes, expenseTypes, allCategories] = await Promise.all([
      branchApi.listByTenant(tenantId, 1, 200),
      tenantId ? posExpenseApi.listTypes(tenantId) : Promise.resolve([]),
      tenantId ? fnzExpenseApi.getCategories(tenantId) : Promise.resolve([]),
    ]);

    return {
      branches: branchRes.branches,
      expenseTypes,
      variableCategories: allCategories.filter((c) => !c.is_fixed && c.is_active),
      tenantId,
    };
  };
