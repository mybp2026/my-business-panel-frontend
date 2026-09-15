export interface ReturnProductPayload {
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_item_id: string;
}

export interface ReturnTransaction {
  return_transaction_id: string;
  invoice_id: string;
  tenant_customer_id: string | null;
  total_refund_amount: number;
  refund_method: number | null;
  return_status_id: number | null;
  description: string;
  return_date: string;
  // Enriched from backend join
  status_name?: string;
  payment_method_name?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_document?: string;
}

export interface ReturnProduct {
  return_product_id: string;
  sale_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_name?: string;
  sku?: string;
}

export interface ReturnTransactionDetail {
  transaction: ReturnTransaction & {
    updated_at: string;
  };
  products: ReturnProduct[];
}
