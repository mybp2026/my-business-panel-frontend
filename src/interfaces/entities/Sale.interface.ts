export interface SaleCondition {
  condition_code: string;
  condition_desc: string;
}

export interface SaleListItem {
  sale_id: string;
  sale_date: string;
  total_amount: number;
  subtotal_amount: number;
  tax_amount: number;
  is_completed: boolean;
  branch_id: string;
  branch_name: string;
  currency_code: string;
  symbol: string;
  is_refunded?: boolean;
  tenant_customer_id?: string;
  created_at?: string;
  return_transaction_id?: string | null;
}

export interface SaleItemPayload {
  tenant_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_price_type?: "NORMAL" | "PROMO" | "SEGMENT" | "MANUAL" | "ROYALTY";
  promotion_id?: string;
  royalty_option_id?: string | null;
  royalty_rule_id?: string | null;
  original_price?: number;
  discount_applied?: number;
}

export interface SalePaymentPayload {
  /** Optional: walk-in / anonymous sales record payments without a customer. */
  tenant_customer_id?: string | null;
  payment_method_id: number;
  is_points_redemption: boolean;
  points_redeemed: number;
  points_to_currency_rate: number;
  payment_amount: number;
  payment_date: string;
  currency_id: number;
  verified: boolean;
}

export interface CreateSaleResult {
  saleId: string;
}

export interface InvoiceItem {
  invoice_item_id: string;
  description: string | null;
  sku: string | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_rate_percentage: number;
  tax_amount: number;
  total_price: number;
}

export interface InvoicePayment {
  customer_payment_id: string;
  payment_method_id: number | null;
  payment_method_name: string | null;
  is_points_redemption: boolean;
  points_redeemed: number;
  payment_amount: number;
  currency_id: number | null;
  currency_code: string | null;
  currency_symbol: string | null;
  payment_date: string;
}

export interface InvoiceInfo {
  invoice_id: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  total_discount: number;
  amount_paid: number;
  change_amount: number;
  points_accumulated: number;
  points_redeemed: number;
  ad_message: string | null;
  due_date: string | null;
  invoiced_at: string;
  /** Null for walk-in/anonymous sales */
  first_name: string | null;
  last_name: string | null;
  document_number: string | null;
  email: string | null;
  customer_econ_activity: string | null;
  customer_phone: string | null;
  customer_birthdate: string | null;
  customer_address: string | null;
  customer_identification_type_name: string | null;
  customer_identification_type_code: string | null;
  tenant_name: string | null;
  tenant_identification: string | null;
  tenant_econ_activity: string | null;
  tenant_sign: string | null;
  tenant_contact_email: string | null;
  tenant_contact_phone: string | null;
  tenant_identification_type_name: string | null;
  tenant_identification_type_code: string | null;
  branch_name: string | null;
  branch_address: string | null;
  sale_condition: string | null;
  sale_condition_desc: string | null;
  sale_date: string;
  seller_user_id: string | null;
  seller_email: string | null;
  currency_code: string | null;
  currency_symbol: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export interface SaleItemDetail {
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_price_type?: string | null;
  original_price?: number | null;
  discount_applied?: number | null;
  promotion_name?: string | null;
}
