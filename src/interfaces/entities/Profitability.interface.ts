// Tipos de la Vista de Rentabilidad.
// El backend devuelve componentes crudos; el pipeline del frontend calcula margenes.

export type ProfitabilityInterval =
  | "24h"
  | "7d"
  | "15d"
  | "30d"
  | "90d"
  | "180d"
  | "365d";

export type BucketUnit = "hour" | "day" | "week" | "month";

export interface BranchRef {
  branch_id: string;
  branch_name: string;
}

export interface SalesComponentRow {
  branch_id: string;
  bucket_start: string;
  currency_id: number;
  net_sales: string; // neto de descuento, en currency_id
  discounts: string; // en currency_id
  cogs: string; // costo de ventas, en CRC
}

export interface ReturnsComponentRow {
  branch_id: string;
  bucket_start: string;
  currency_id: number;
  returns: string; // en currency_id
  returns_cogs: string; // costo devuelto, en CRC
}

export interface ExpenseComponentRow {
  branch_id: string;
  bucket_start: string;
  amount_crc: string; // gastos en CRC
}

// Respuesta cruda del endpoint GET /finances/profitability.
export interface ProfitabilityRawData {
  interval: ProfitabilityInterval;
  range_start: string;
  bucket_unit: BucketUnit;
  branches: BranchRef[];
  sales: SalesComponentRow[];
  returns: ReturnsComponentRow[];
  expenses: ExpenseComponentRow[];
}

// ─── Tipos computados (salida del pipeline) ─────────────────────────────────

export interface ProfitabilityPoint {
  bucket_start: string;
  label: string; // etiqueta del eje X
  vn: number; // ventas netas
  ub: number; // utilidad bruta
  un: number; // utilidad neta
  mb_pct: number; // margen bruto %
  mn_pct: number; // margen neto %
}

export interface ProfitabilitySeries {
  points: ProfitabilityPoint[];
  total_vn: number;
  total_ub: number;
  total_un: number;
}

export interface BranchProfitability extends ProfitabilitySeries {
  branch_id: string;
  branch_name: string;
  contribution_pct: number; // aporte de sucursal (AS%)
}

export interface ProfitabilityResult {
  general: ProfitabilitySeries;
  branches: BranchProfitability[];
}
