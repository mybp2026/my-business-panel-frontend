export type NumericLike = number | string;

export interface SaleAccountReceivable {
  sale_account_receivable_id: string;
  sale_id: string;
  account_receivable_id: string;
  account_receivable_status: number;
  account_receivable_status_name: string;
  tenant_id: string;
  tenant_customer_id?: string | null;
  customer_name?: string | null;
  customer_document?: string | null;
  due_date: string;
  subtotal: NumericLike;
  tax_amount: NumericLike;
  total_amount: NumericLike;
  amount_paid: NumericLike;
  balance_due: NumericLike;
  is_paid: boolean;
  collection_count: number;
  last_collection_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaleAccountReceivableListResponse {
  receivables: SaleAccountReceivable[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdatedSaleAccountReceivable {
  sale_account_receivable_id: string;
  sale_id: string;
  account_receivable_id: string;
  account_receivable_status: number;
  account_receivable_status_name: string;
  due_date: string;
  subtotal: NumericLike;
  tax_amount: NumericLike;
  total_amount: NumericLike;
  amount_paid: NumericLike;
  balance_due: NumericLike;
  is_paid: boolean;
  updated_at?: string;
}

export interface ReceivableStatusCatalog {
  status_id: number;
  status_name: string;
  description?: string | null;
}

export interface ReceivablePaymentMethodCatalog {
  payment_method_id: number;
  name: string;
  description?: string | null;
}

export interface ReceivableCurrencyCatalog {
  currency_id: number;
  currency_code: string;
  currency_name: string;
  symbol: string;
}

export interface ReceivableCatalogs {
  receivable_statuses: ReceivableStatusCatalog[];
  payment_methods: ReceivablePaymentMethodCatalog[];
  currencies: ReceivableCurrencyCatalog[];
}

export interface CollectionAlert {
  collection_alert_id: string;
  sale_account_receivable_id: string;
  sale_id: string;
  customer_name: string;
  alert_type: string;
  alert_type_description?: string | null;
  due_date: string;
  days_until_due: number;
  balance_remaining: NumericLike;
  alert_date: string;
  created_at: string;
}

export interface CollectionAlertStats {
  total_alerts: number;
  overdue_count: number;
  urgent_count: number;
  warning_count: number;
  total_amount_at_risk: NumericLike;
}

export interface CollectionAlertType {
  collection_alert_type_id: number;
  collection_alert_type_name: string;
  description?: string | null;
}

export interface CollectionAlertConfig {
  collection_alert_config_id: string;
  tenant_id: string;
  warning_days_before_due: number;
  urgent_days_before_due: number;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CollectionAlertConfigResponse {
  tenant_id: string;
  config: CollectionAlertConfig | null;
  alert_types: CollectionAlertType[];
}
