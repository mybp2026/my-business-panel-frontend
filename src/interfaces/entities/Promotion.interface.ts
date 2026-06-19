export type PromotionTypeName =
  | "percentage_discount"
  | "fixed_amount_discount"
  | "buy_x_get_y"
  | "volume_discount"
  | "tiered_pricing"
  | "combo"
  | "free_shipping";

export interface PromotionType {
  promotion_type_id: number;
  type_name: PromotionTypeName;
}

export interface PromotionRule {
  promotion_rule_id?: string;
  promotion_id?: string;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  buy_quantity?: number | null;
  get_quantity?: number | null;
  get_discount_percentage?: number | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  tier_level?: number | null;
  tier_min_quantity?: number | null;
  tier_max_quantity?: number | null;
  tier_price?: number | null;
  tier_discount_percentage?: number | null;
  min_purchase_amount?: number | null;
}

export type PromotionTargetType = "VARIANT" | "GROUP";

export interface PromotionTarget {
  promotion_target_id?: string;
  target_type: PromotionTargetType;
  target_product_variant_id?: string | null;
  target_group_id?: string | null;
}

export interface PromotionTargetInput {
  target_type: PromotionTargetType;
  target_id: string;
}

export interface Promotion {
  promotion_id: string;
  tenant_id?: string;
  promotion_name: string;
  promotion_code: string;
  promotion_description?: string | null;
  promotion_type_id?: number;
  type_name: PromotionTypeName;
  is_universal?: boolean;
  customer_segment_ids?: number[];
  segment_names?: string[];
  promotion_start_date: string;
  promotion_end_date: string;
  is_active: boolean;
  is_default?: boolean;
  is_stackable?: boolean;
  rule?: PromotionRule;
  rules?: PromotionRule[];
  targets?: PromotionTarget[];
  created_at?: string;
  updated_at?: string;
}

export type PromoInterval =
  | "24h"
  | "7d"
  | "15d"
  | "30d"
  | "90d"
  | "180d"
  | "365d";

export interface PromoAnalyticsRow {
  promotion_id: string;
  promotion_name: string;
  promotion_code: string | null;
  is_active: boolean;
  promotion_type: string;
  currency_id: number;
  sale_count: string;
  total_discount: string;
  total_revenue: string;
}

export interface PromoAnalyticsSummary {
  promotion_id: string;
  promotion_name: string;
  promotion_code: string | null;
  is_active: boolean;
  promotion_type: string;
  sale_count: number;
  total_discount: number;
  total_revenue: number;
}
