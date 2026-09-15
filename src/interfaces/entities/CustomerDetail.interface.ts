export interface CustomerDetail {
  customer_id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  identification_type: number;
  document_number: string;
  econ_activity?: string;
  birthdate?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_tenant: boolean;
  created_at: string;
  updated_at: string;

  // Segment
  segment_id?: number;
  segment_name?: string;
  segment_hierarchy?: number;

  // Loyalty score
  loyalty_score: number;
  loyalty_lifetime_score: number;
  loyalty_score_redeemed: number;
  last_earned_at?: string;
  last_redeemed_at?: string;

  // Loyalty program config
  loyalty_program_id?: string;
  points_earned_per_currency_unit?: number;
  points_redeemed_per_currency_unit?: number;
  minimum_purchase_for_points?: number;
  loyalty_program_active?: boolean;
}

export interface CustomerSaleHistoryItem {
  sale_id: string;
  sale_date: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  is_completed: boolean;
  currency_code: string;
  currency_symbol: string;
  branch_name?: string;
  invoice_id?: string;
  digital_invoiced_at?: string;
  return_transaction_id?: string;
  return_status_id?: number;
  total_refund_amount?: number;
}

export interface CustomerSalesHistoryResponse {
  sales: CustomerSaleHistoryItem[];
  total: number;
  page: number;
  limit: number;
}
