type NumericLike = number | string | null | undefined;

export interface AccountPayableOverview {
  purchase_account_payable_id: string;
  purchase_order_id: string;
  supplier_name: string;
  total_amount: NumericLike;
  balance_due: NumericLike;
  amount_paid: NumericLike;
  created_at: string;
  due_date: string;
  payment_count: number;
  last_payment_date: string | null;
  account_payable_status: number;
  account_payable_status_name: string;
  is_paid: boolean;
  tenant_id: string;
  tenant_name?: string;
}

export interface AccountReceivableOverview {
  sale_account_receivable_id: string;
  sale_id: string;
  customer_name: string | null;
  customer_document: string | null;
  digital_sale_invoice_id: string | null;
  total_amount: NumericLike;
  balance_due: NumericLike;
  amount_paid: NumericLike;
  created_at: string;
  due_date: string;
  collection_count: number;
  last_collection_date: string | null;
  account_receivable_status: number;
  account_receivable_status_name: string;
  is_paid: boolean;
  tenant_id: string;
}

export interface AccountsAlertConfig {
  warning_days_before_due: number;
  urgent_days_before_due: number;
}

export interface AccountsOverviewData {
  payables: AccountPayableOverview[];
  receivables: AccountReceivableOverview[];
  payables_alert_config: AccountsAlertConfig | null;
  receivables_alert_config: AccountsAlertConfig | null;
}

export type AccountAlertStatus =
  | "al_dia"
  | "advertencia"
  | "urgente"
  | "vencida";

export interface AccountListParams {
  status?: string;
  sort_by?: string;
  sort_dir?: string;
  branchId?: string;
}

export interface PayablePayment {
  purchase_order_payment_id: string;
  purchase_account_payable_id: string;
  payment_method_id: number | null;
  payment_method_name: string | null;
  amount_paid: string | number;
  payment_reference: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
}

export interface ReceivableCollection {
  sale_collection_id: string;
  sale_account_receivable_id: string;
  payment_method_id: number | null;
  payment_method_name: string | null;
  amount_paid: string | number;
  original_amount: string | number | null;
  exchange_rate: string | number | null;
  currency_id: number;
  payment_reference: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
}
