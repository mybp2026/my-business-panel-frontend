export interface CreateSupplierRequest {
  supplier_name: string;
  supplier_contact_info: string;
  supplier_address: string;
  supplier_notes?: string;
}

export interface UpdateSupplierRequest {
  supplier_name?: string;
  supplier_contact_info?: string;
  supplier_address?: string;
  supplier_notes?: string;
}

export interface CreatePurchaseOrderItemRequest {
  product_variant_id: string;
  quantity_ordered: number;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  warehouse_id: string;
  expected_delivery_date: string;
  has_invoice?: boolean;
  payment_condition?: "CREDIT" | "IN_FULL";
  /** Obligatoria cuando payment_condition es CREDIT; ignorada para IN_FULL. */
  payment_due_date?: string;
  items: CreatePurchaseOrderItemRequest[];
}

export interface CreatePurchasePaymentRequest {
  purchase_account_payable_id: string;
  amount_paid: number;
  payment_method_id: number;
  currency_id?: number;
  payment_reference?: string;
}

export interface UpsertPaymentAlertConfigRequest {
  tenant_id?: string;
  warning_days_before_due: number;
  urgent_days_before_due: number;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
}

export interface UpdateSupplierInvoiceItemRequest {
  product_variant_id: string;
  quantity_billed: number;
  unit_price: number;
}

export interface UpdateSupplierInvoiceRequest {
  items: UpdateSupplierInvoiceItemRequest[];
}

export interface CreatePurchaseDisputeRequest {
  purchase_order_id: string;
  supplier_invoice_id?: string;
  dispute_type: "MISSING_GOODS" | "PRICE_MISMATCH";
  description: string;
}

export interface ResolvePurchaseDisputeRequest {
  resolution_notes: string;
}
