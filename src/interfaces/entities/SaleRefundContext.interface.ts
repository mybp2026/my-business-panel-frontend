export interface RefundSale {
  sale_id: string;
  tenant_customer_id: string | null;
  sale_date: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  is_completed: boolean;
  branch_id: string;
  branch_name: string | null;
  tenant_id: string;
  currency_code: string | null;
  currency_symbol: string | null;
}

export interface RefundCustomer {
  tenant_customer_id: string;
  first_name: string | null;
  last_name: string | null;
  document_number: string | null;
  email: string | null;
}

export interface RefundInvoice {
  invoice_id: string;
  invoiced_at: string | null;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
}

export interface RefundItem {
  sale_item_id: string;
  product_variant_id: string;
  sku: string | null;
  variant_name: string | null;
  available_quantity: number;
  unit_price: number;
  total_price: number;
  invoice_item_id: string | null;
}

export interface SaleRefundContext {
  sale: RefundSale;
  customer: RefundCustomer | null;
  invoice: RefundInvoice | null;
  items: RefundItem[];
}
