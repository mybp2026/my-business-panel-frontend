export type NumericLike = number | string;

export interface Supplier {
  supplier_id: string;
  supplier_name: string;
  supplier_contact_info: string;
  supplier_address: string;
  supplier_notes?: string | null;
  added_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  purchase_order_item_id: string;
  product_variant_id: string;
  sku?: string;
  variant_name?: string;
  quantity_ordered: number;
  unit_price: NumericLike;
  line_total?: NumericLike;
  /** Total units of this variant sold across all time (completed sales only). */
  sales_quantity_lifetime?: NumericLike;
  /** Gross revenue from this variant across all time. */
  sales_revenue_lifetime?: NumericLike;
  /** Units sold of this variant in the last 30 days (current rotation). */
  sales_quantity_30d?: NumericLike;
  /** Revenue from the last 30 days. */
  sales_revenue_30d?: NumericLike;
  /** Units sold since this purchase order was placed. */
  sales_quantity_since_po?: NumericLike;
  /** Revenue since this purchase order was placed. */
  sales_revenue_since_po?: NumericLike;
  /** Date of the most recent completed sale of this variant, if any. */
  last_sold_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierInvoice {
  supplier_invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  payment_condition: string;
  due_date: string;
  subtotal_amount: NumericLike;
  tax_rate: NumericLike;
  tax_amount: NumericLike;
  total_amount: NumericLike;
  paid: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PurchasePayment {
  purchase_order_payment_id: string;
  purchase_account_payable_id: string;
  payment_method_id: number;
  payment_method_name?: string | null;
  currency_id?: number | null;
  currency_code?: string | null;
  currency_name?: string | null;
  currency_symbol?: string | null;
  amount_paid: NumericLike;
  payment_reference?: string | null;
  notes?: string | null;
  payment_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface CurrencyCatalog {
  currency_id: number;
  currency_code: string;
  currency_name: string;
  symbol: string;
}

export interface ExchangeRateResult {
  exchange_rate_id: string;
  from_currency_id: number;
  from_currency_code: string;
  from_currency_name: string;
  from_currency_symbol: string;
  to_currency_id: number;
  to_currency_code: string;
  to_currency_name: string;
  to_currency_symbol: string;
  rate: string;
  effective_date: string;
  updated_at: string;
}

export interface GoodsReceiptSummary {
  goods_receipt_id: string;
  received_date: string;
  subtotal_amount: NumericLike;
  tax_amount: NumericLike;
  total_amount: NumericLike;
  items_received: number;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrder {
  purchase_order_id: string;
  purchase_order_date: string;
  expected_delivery_date: string;
  payment_due_date?: string | null;
  purchase_order_status_id: number;
  purchase_order_status_name: string;
  supplier_id: string;
  supplier_name: string;
  warehouse_id: string;
  warehouse_name?: string;
  branch_id?: string;
  branch_name?: string;
  tenant_id?: string;
  tenant_name?: string;
  purchase_account_payable_id?: string | null;
  account_payable_status?: number | null;
  account_payable_status_name?: string | null;
  account_payable_id?: string | null;
  due_date?: string | null;
  subtotal?: NumericLike;
  tax_amount?: NumericLike;
  total_amount?: NumericLike;
  amount_paid?: NumericLike;
  balance_due?: NumericLike;
  is_paid?: boolean;
  invoice_number?: string | null;
  payment_condition?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  items: PurchaseOrderItem[];
  invoices: SupplierInvoice[];
  payments: PurchasePayment[];
  goods_receipts: GoodsReceiptSummary[];
}

export interface PurchaseMatching {
  purchase_order_id: string;
  matching_found: boolean;
  matching_id?: string;
  goods_receipt_id?: string;
  supplier_invoice_id?: string;
  amounts_matched?: boolean;
  quantities_matched?: boolean;
  is_matched?: boolean;
  matched_at?: string;
  amount_comparison?: Record<string, unknown>;
  quantity_comparison?: Record<string, unknown>;
  message?: string;
}

export interface PurchaseAccountPayable {
  purchase_account_payable_id: string;
  purchase_order_id: string;
  account_payable_status: number;
  account_payable_status_name: string;
  purchase_order_status_id: number;
  purchase_order_status_name: string;
  supplier_id: string;
  supplier_name: string;
  warehouse_id: string;
  warehouse_name: string;
  branch_id: string;
  branch_name: string;
  tenant_id: string;
  tenant_name?: string;
  account_payable_id: string;
  due_date: string;
  subtotal: NumericLike;
  tax_amount: NumericLike;
  total_amount: NumericLike;
  amount_paid: NumericLike;
  balance_due: NumericLike;
  is_paid: boolean;
  invoice_number?: string | null;
  payment_condition?: string | null;
  payment_count: number;
  last_payment_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseStatusCatalog {
  status_id: number;
  status_name: string;
  description?: string | null;
}

export interface PaymentMethodCatalog {
  payment_method_id: number;
  name: string;
  description?: string | null;
}

export interface PaymentConditionOption {
  value: string;
  label: string;
}

export interface PurchaseCatalogs {
  order_statuses: PurchaseStatusCatalog[];
  payable_statuses: PurchaseStatusCatalog[];
  payment_methods: PaymentMethodCatalog[];
  currencies: CurrencyCatalog[];
  payment_conditions: PaymentConditionOption[];
}

export interface PaymentAlert {
  payment_alert_id: string;
  purchase_account_payable_id: string;
  purchase_order_id: string;
  supplier_name: string;
  invoice_number?: string | null;
  alert_type: string;
  alert_type_description?: string | null;
  due_date: string;
  days_until_due: number;
  balance_remaining: NumericLike;
  alert_date: string;
  created_at: string;
}

export interface PaymentAlertStats {
  total_alerts: number;
  overdue_count: number;
  urgent_count: number;
  warning_count: number;
  total_amount_at_risk: NumericLike;
}

export interface PaymentAlertType {
  payment_alert_type_id: number;
  payment_alert_type_name: string;
  description?: string | null;
}

export interface PaymentAlertConfig {
  payment_alert_config_id: string;
  tenant_id: string;
  warning_days_before_due: number;
  urgent_days_before_due: number;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentAlertConfigResponse {
  tenant_id: string;
  config: PaymentAlertConfig | null;
  alert_types: PaymentAlertType[];
}

export type PurchaseDisputeType = 'MISSING_GOODS' | 'PRICE_MISMATCH';
export type PurchaseDisputeStatus = 'OPEN' | 'RESOLVED';

export interface PurchaseDispute {
  dispute_id: string;
  purchase_order_id: string;
  supplier_invoice_id?: string | null;
  tenant_id: string;
  dispute_type: PurchaseDisputeType;
  description: string;
  status: PurchaseDisputeStatus;
  notify_supplier_pending: boolean;
  resolution_notes?: string | null;
  created_at?: string;
  resolved_at?: string | null;
  updated_at?: string;
}
