import api from "./api";
import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  FixedVsVariableAnalytic,
  CategoryAnalytic,
  SalesVsExpensesPoint,
  ExpenseCategory,
  CreateExpensePayload,
  CreateExpenseCategoryPayload,
} from "@/interfaces/entities/FnzExpense.interface";

export const fnzExpenseApi = {
  // --- ANALYTICS ---

  async getFixedVsVariable(
    tenantId: string,
    start: string,
    end: string,
  ): Promise<FixedVsVariableAnalytic[]> {
    const res = await api.get<ApiResponse<FixedVsVariableAnalytic[]>>(
      `/expense/analytics/fixed-vs-variable/${tenantId}`,
      { params: { start, end } },
    );
    return res.data.data;
  },

  async getFixedBreakdown(
    tenantId: string,
    start: string,
    end: string,
  ): Promise<CategoryAnalytic[]> {
    const res = await api.get<ApiResponse<CategoryAnalytic[]>>(
      `/expense/analytics/fixed-breakdown/${tenantId}`,
      { params: { start, end } },
    );
    return res.data.data;
  },

  async getVariableBreakdown(
    tenantId: string,
    start: string,
    end: string,
  ): Promise<CategoryAnalytic[]> {
    const res = await api.get<ApiResponse<CategoryAnalytic[]>>(
      `/expense/analytics/variable-breakdown/${tenantId}`,
      { params: { start, end } },
    );
    return res.data.data;
  },

  async getSalesVsExpenses(
    tenantId: string,
    start: string,
    end: string,
    branchId?: string | null,
  ): Promise<SalesVsExpensesPoint[]> {
    const res = await api.get<ApiResponse<SalesVsExpensesPoint[]>>(
      `/expense/analytics/sales-vs-expenses/${tenantId}`,
      {
        params: {
          start,
          end,
          ...(branchId ? { branchId } : {}),
        },
      },
    );
    return res.data.data;
  },

  // --- CATEGORIES ---

  async getCategories(tenantId: string): Promise<ExpenseCategory[]> {
    const res = await api.get<ApiResponse<ExpenseCategory[]>>(
      `/expense/categories/${tenantId}`,
    );
    return res.data.data;
  },

  async createCategory(
    data: CreateExpenseCategoryPayload,
  ): Promise<string> {
    const res = await api.post<ApiResponse<string>>(
      "/expense/categories",
      data,
    );
    return res.data.data;
  },

  // --- EXPENSES ---

  async createExpense(
    data: CreateExpensePayload,
  ): Promise<{ expenseId: string }> {
    const res = await api.post<ApiResponse<{ expenseId: string }>>(
      "/expense",
      data,
    );
    return res.data.data;
  },
};
