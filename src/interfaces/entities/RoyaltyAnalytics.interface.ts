// Tipos de la analitica de Regalias (GET /pos-royalty/analytics/:tenantId).
// Regalia = sale_item con sale_price_type = 'ROYALTY'; valor = total_price.

export type RoyaltyInterval =
  | "24h"
  | "7d"
  | "15d"
  | "30d"
  | "90d"
  | "180d"
  | "365d";

export type RoyaltyBucketUnit = "hour" | "day" | "week" | "month";

export interface RoyaltyTotals {
  total_value: number;
  gift_lines: number;
  total_sales: number;
  pct_of_sales: number;
}

export interface RoyaltyCategoryRow {
  category_id: string | null;
  category_name: string;
  value: number;
  quantity: number;
}

export interface RoyaltyCustomerRow {
  tenant_customer_id: string | null;
  name: string;
  document_number: string | null;
  value: number;
  quantity: number;
}

export interface RoyaltyEvolutionPoint {
  bucket_start: string;
  value: number;
  quantity: number;
}

export interface RoyaltyAnalytics {
  interval: RoyaltyInterval;
  range_start: string;
  bucket_unit: RoyaltyBucketUnit;
  totals: RoyaltyTotals;
  by_category: RoyaltyCategoryRow[];
  by_customer: RoyaltyCustomerRow[];
  evolution: RoyaltyEvolutionPoint[];
}
