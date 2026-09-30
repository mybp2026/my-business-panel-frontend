import api from "./api";
import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  EffectiveExchangeRate,
  ExchangeRate,
  ExchangeRateBase,
  ExchangeRateLedgerEntry,
} from "@/interfaces/entities/ExchangeRate.interface";

/** Adapta la tasa efectiva a la forma que esperan los consumidores viejos. */
const toLegacyShape = (eff: EffectiveExchangeRate): ExchangeRate => ({
  from_currency_id: eff.from_currency_id,
  to_currency_id: eff.to_currency_id,
  rate: eff.effective_rate,
  effective_at:
    (eff.auto_update ? eff.base_at : eff.manual_at) ??
    eff.base_at ??
    eff.manual_at ??
    "",
});

/**
 * Tasa de cambio USD -> VES. Ledger inmutable: no hay update ni delete --
 * cambiar la tasa base o el diferencial agrega un registro nuevo.
 */
export const exchangeRateApi = {
  /** Tasa vigente del tenant: base global + su diferencial. */
  async getEffective(): Promise<EffectiveExchangeRate> {
    const response = await api.get<ApiResponse<EffectiveExchangeRate>>(
      "/exchange-rate/effective",
    );
    return response.data.data;
  },

  /** Historial: cada cambio de tasa base o de diferencial. */
  async getLedger(): Promise<ExchangeRateLedgerEntry[]> {
    const response = await api.get<ApiResponse<ExchangeRateLedgerEntry[]>>(
      "/exchange-rate/ledger",
    );
    return response.data.data ?? [];
  },

  /** Tasa base global vigente, sin diferencial. */
  async getBase(): Promise<ExchangeRateBase | null> {
    const response = await api.get<ApiResponse<ExchangeRateBase | null>>(
      "/exchange-rate/base",
    );
    return response.data.data;
  },

  /** Carga una tasa base nueva. Afecta a todos los tenants. */
  async setBase(rate: number, source?: string): Promise<ExchangeRateBase> {
    const response = await api.post<ApiResponse<ExchangeRateBase>>(
      "/exchange-rate/base",
      { rate, source },
    );
    return response.data.data;
  },

  /**
   * Tasa vigente en la forma legacy que consumen las pantallas de finanzas,
   * ventas y compras. Devuelve un solo elemento: el sistema es bimonetario
   * y hay una sola tasa aplicable por tenant.
   */
  async getAll(): Promise<ExchangeRate[]> {
    try {
      return [toLegacyShape(await this.getEffective())];
    } catch {
      // Sin tasa base cargada: los consumidores tratan [] como "sin tasa".
      return [];
    }
  },

  /** Igual que getAll, para los consumidores que piden una sola tasa. */
  async getLatest(): Promise<ExchangeRate | null> {
    try {
      return toLegacyShape(await this.getEffective());
    } catch {
      return null;
    }
  },

  /**
   * Activa/desactiva la actualizacion automatica de tasa del tenant. Con
   * false el tenant ignora la tasa base (BCV) y opera con su tasa manual.
   */
  async setAutoUpdate(autoUpdate: boolean) {
    const response = await api.put<
      ApiResponse<{ tenant_id: string; auto_update: boolean }>
    >("/exchange-rate/auto-update", { auto_update: autoUpdate });
    return response.data.data;
  },

  /** Carga la tasa manual del tenant (aplica con auto_update = false). */
  async setManualRate(rate: number) {
    const response = await api.post<ApiResponse<{ manual_rate_id: string }>>(
      "/exchange-rate/manual",
      { rate },
    );
    return response.data.data;
  },

  /** Carga el diferencial del tenant. 0 lo restablece. */
  async setDelta(delta: number, source?: string) {
    const response = await api.post<ApiResponse<{ delta_id: string }>>(
      "/exchange-rate/delta",
      { delta, source },
    );
    return response.data.data;
  },
};
