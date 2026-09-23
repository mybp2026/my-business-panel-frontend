/**
 * Tasa de cambio USD -> VES (sistema bimonetario Venezuela).
 * La tasa base es global (BCV); el diferencial es por tenant.
 * Tasa efectiva = base + delta.
 */
export interface EffectiveExchangeRate {
  base_rate: string;
  delta: string;
  effective_rate: string;
  base_at: string;
  delta_at: string | null;
  from_currency_id: number;
  to_currency_id: number;
}

/**
 * Forma que consumen las pantallas y utilidades de conversion
 * (utils/currency.ts, loaders de finanzas, ventas, compras). Se sigue
 * devolviendo para no reescribir esos 15 consumidores, pero ahora `rate`
 * es SIEMPRE la tasa efectiva del tenant (base + diferencial), no una fila
 * cruda de exchange_rate.
 */
export interface ExchangeRate {
  from_currency_id: number;
  to_currency_id: number;
  rate: string;
  effective_at: string;
}

/** Fila del ledger inmutable: un cambio de tasa base o de diferencial. */
export interface ExchangeRateLedgerEntry {
  tenant_id: string;
  effective_at: string;
  change_kind: "base" | "delta";
  source: string | null;
  base_rate: string;
  delta: string;
  effective_rate: string;
  created_at: string;
}

/** Tasa base global vigente. */
export interface ExchangeRateBase {
  exchange_rate_id: string;
  rate: string;
  effective_at: string;
  source: string | null;
  created_at: string;
}
