import api from "./api";
import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  AccountListParams,
  AccountPayableOverview,
  AccountReceivableOverview,
  AccountsOverviewData,
  PayablePayment,
  ReceivableCollection,
} from "@/interfaces/entities/Finances.interface";
import type {
  FixedVsVariableAnalytic,
  CategoryAnalytic,
  SalesVsExpensesPoint,
  ExpenseCategory,
  CreateExpensePayload,
  CreateExpenseCategoryPayload,
} from "@/interfaces/entities/FnzExpense.interface";

export const financesApi = {
  // --- CUENTAS POR PAGAR / COBRAR ---

  async getAccountsOverview(): Promise<AccountsOverviewData> {
    const res = await api.get<ApiResponse<AccountsOverviewData>>("/finances/accounts");
    return res.data.data;
  },

  async getPayables(params: AccountListParams): Promise<AccountPayableOverview[]> {
    const res = await api.get<ApiResponse<AccountPayableOverview[]>>(
      "/finances/accounts/payables",
      { params },
    );
    return res.data.data;
  },

  async getReceivables(params: AccountListParams): Promise<AccountReceivableOverview[]> {
    const res = await api.get<ApiResponse<AccountReceivableOverview[]>>(
      "/finances/accounts/receivables",
      { params },
    );
    return res.data.data;
  },

  async getPayablePayments(payableId: string): Promise<PayablePayment[]> {
    const res = await api.get<ApiResponse<PayablePayment[]>>(
      `/finances/accounts/payable/${payableId}/payments`,
    );
    return res.data.data;
  },

  async getReceivableCollections(receivableId: string): Promise<ReceivableCollection[]> {
    const res = await api.get<ApiResponse<ReceivableCollection[]>>(
      `/finances/accounts/receivable/${receivableId}/collections`,
    );
    return res.data.data;
  },

  // --- ANALYTICS DE GASTOS ---

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

  // --- CATEGORIAS DE GASTO ---

  async getCategories(tenantId: string, search?: string): Promise<ExpenseCategory[]> {
    const res = await api.get<ApiResponse<ExpenseCategory[]>>(
      `/expense/categories/${tenantId}`,
      search !== undefined && search !== '' ? { params: { search } } : {},
    );
    return res.data.data;
  },

  async createCategory(data: CreateExpenseCategoryPayload): Promise<string> {
    const res = await api.post<ApiResponse<string>>("/expense/categories", data);
    return res.data.data;
  },

  async provisionCategories(tenantId: string): Promise<number> {
    const res = await api.post<ApiResponse<number>>(
      `/expense/categories/provision/${tenantId}`,
    );
    return res.data.data;
  },

  // --- GASTOS ---

  async createExpense(data: CreateExpensePayload): Promise<{ expenseId: string }> {
    const res = await api.post<ApiResponse<{ expenseId: string }>>("/expense", data);
    return res.data.data;
  },
};
