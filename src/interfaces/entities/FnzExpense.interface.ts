// Analytics responses from the 4 new endpoints
export interface FixedVsVariableAnalytic {
  is_fixed: boolean;
  expense_type: string; // 'Fijo' | 'Variable'
  total_amount: string;
}

export interface CategoryAnalytic {
  category_id: string;
  category_name: string;
  account_code: string;
  total_amount: string;
}

export interface SalesVsExpensesPoint {
  period: string;
  total_sales: string;
  total_expenses: string;
}

export interface ExpenseAnalyticsData {
  fixedVsVariable: FixedVsVariableAnalytic[];
  fixedBreakdown: CategoryAnalytic[];
  variableBreakdown: CategoryAnalytic[];
  salesVsExpenses: SalesVsExpensesPoint[];
}

// Accounting expense category (from accounting_schema.expense_category)
export interface ExpenseCategory {
  category_id: string;
  tenant_id: string;
  name: string;
  account_code: string;
  parent_category_id: string | null;
  is_fixed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Payload to create an accounting expense (POST /expense)
export interface CreateExpensePayload {
  tenant_id: string;
  branch_id: string;
  category_id: string;
  description?: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  currency_id: number;
  expense_date: string; // 'YYYY-MM-DD'
  payment_method: "CASH" | "BANK" | "CREDIT_CARD" | "CHECK" | "TRANSFER";
  reference_number?: string;
  notes?: string;
  created_by?: string;
}

// Payload to create an expense category (POST /expense/categories)
export interface CreateExpenseCategoryPayload {
  tenant_id: string;
  name: string;
  account_code: string;
  parent_category_id?: string;
  is_fixed: boolean;
}
