export interface CartItem {
  id: string;
  product_variant_id: string;
  variant_name: string;
  sku?: string;
  group_ids?: string[];
  quantity: number;
  unit_price: number;
  total_price: number;
  includes_iva?: boolean;
  sale_price_type?: "NORMAL" | "PROMO" | "SEGMENT" | "MANUAL" | "ROYALTY";
  royalty_option_id?: string | null;
  royalty_rule_id?: string | null;
}

export interface PaymentSplit {
  id: string;
  methodId: number;
  amount: string;
  currencyId: number;
}
