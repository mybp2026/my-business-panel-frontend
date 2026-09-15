export interface UpdateProductRequest {
  sku?: string;
  variant_name?: string;
  product_name?: string;
  description?: string;
  unit_price?: number;
  cost_price?: number;
  supplier_id?: string | null;
  giftable?: boolean;
  giftable_from?: number;
  includes_iva?: boolean;
  attribute_value_ids?: string[];
  group_ids?: string[];
}
