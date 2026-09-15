export interface Product {
  product_id: string;
  sku: string;
  product_name: string;
  description?: string;
  price: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  product_variant_id?: string;
  variant_name?: string;
  unit_price?: number;
  cost_price?: number;
  is_composite?: boolean;
  supplier_id?: string;
  supplier_name?: string;
  giftable?: boolean;
  giftable_from?: number;
  includes_iva?: boolean;
}
