import type {
  SaleItemPayload,
  SalePaymentPayload,
} from "@/interfaces/entities/Sale.interface";

export interface CreateSaleRequest {
  tenant_id: string;
  branch_id: string;
  currency_id: number;
  /** Optional: walk-in / anonymous sales pueden omitir el cliente. */
  tenant_customer_id?: string | null;
  /** Used by the backend to link the sale to the active cash register session. */
  cash_register_id?: string;
  /** Stored directly on digital_sale_invoice for session traceability. */
  cash_register_session_id?: string;
  sale_condition: string;
  sale_date: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  is_completed: boolean;
  seller_user_id?: string;
  /** ISO date string (YYYY-MM-DD). Defaults to today; required for apartado. */
  due_date?: string;
  /** Optional message the cashier can add to the digital invoice. */
  ad_message?: string;
  /** Total amount collected from the customer (in sale currency). */
  amount_paid?: number;
  /** Change returned to the customer when amount_paid > total (in sale currency). */
  change_amount?: number;
  items: SaleItemPayload[];
  payments: SalePaymentPayload[];
}
