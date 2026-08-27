// Tipos de la Vista financiera de Puntos de Fidelidad (GET /finances/loyalty/overview).
// El backend agrega el pasivo de puntos a nivel tenant y calcula la equivalencia
// monetaria con la tasa de canje del programa activo.

export type LoyaltyInterval =
  | "24h"
  | "7d"
  | "15d"
  | "30d"
  | "90d"
  | "180d"
  | "365d";

export type BucketUnit = "hour" | "day" | "week" | "month";

export interface LoyaltyProgramConfig {
  points_earned_per_currency_unit: string;
  points_redeemed_per_currency_unit: string;
  is_active: boolean;
}

export interface LoyaltyTotals {
  active_points: number;
  redeemed_points: number;
  lifetime_points: number;
  expired_points: number;
  customers_with_points: number;
  active_value: number;
  redeemed_value: number;
  lifetime_value: number;
  expired_value: number;
}

export interface LoyaltyGrowthPoint {
  bucket_start: string;
  earned: number;
  redeemed: number;
}

export interface LoyaltyTopCustomer {
  tenant_customer_id: string;
  name: string;
  document_number: string | null;
  score: number;
  lifetime_score: number;
  value: number;
}

export interface LoyaltyOverview {
  interval: LoyaltyInterval;
  range_start: string;
  bucket_unit: BucketUnit;
  config: LoyaltyProgramConfig | null;
  totals: LoyaltyTotals;
  growth: LoyaltyGrowthPoint[];
  top_customers: LoyaltyTopCustomer[];
}
