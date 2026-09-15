import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

export const BASE_CURRENCY_ID = 1;
export const BASE_CURRENCY_CODE = "VES";

// Tasa de una moneda a la moneda base. Busca directa, luego inversa.
export function getExchangeRateToBase(
  rates: ExchangeRate[],
  fromCurrencyId: number,
): number | null {
  if (fromCurrencyId === BASE_CURRENCY_ID) return 1;
  const direct = rates.find(
    (r) =>
      Number(r.from_currency_id) === fromCurrencyId &&
      Number(r.to_currency_id) === BASE_CURRENCY_ID,
  );
  if (direct) return Number(direct.rate);
  const rev = rates.find(
    (r) =>
      Number(r.from_currency_id) === BASE_CURRENCY_ID &&
      Number(r.to_currency_id) === fromCurrencyId,
  );
  if (rev && Number(rev.rate) > 0) return 1 / Number(rev.rate);
  return null;
}

// Convierte un monto en la moneda base a la moneda destino.
export function convertFromBase(
  amountBase: number,
  targetCurrencyId: number,
  rates: ExchangeRate[],
): number | null {
  if (targetCurrencyId === BASE_CURRENCY_ID) return amountBase;
  const toTarget = rates.find(
    (r) =>
      Number(r.from_currency_id) === BASE_CURRENCY_ID &&
      Number(r.to_currency_id) === targetCurrencyId,
  );
  if (toTarget) return amountBase * Number(toTarget.rate);
  const toBase = getExchangeRateToBase(rates, targetCurrencyId);
  if (toBase && toBase > 0) return amountBase / toBase;
  return null;
}

// Convierte un monto entre dos monedas cualesquiera (via la moneda base como pivote).
// Si falta la tasa, cae al monto original (1:1) para no producir NaN.
export function convertCurrency(
  amount: number,
  fromCurrencyId: number,
  toCurrencyId: number,
  rates: ExchangeRate[],
): number {
  if (!amount) return 0;
  if (fromCurrencyId === toCurrencyId) return amount;
  const inBase =
    fromCurrencyId === BASE_CURRENCY_ID
      ? amount
      : (getExchangeRateToBase(rates, fromCurrencyId) ?? 1) * amount;
  const converted = convertFromBase(inBase, toCurrencyId, rates);
  return converted ?? inBase;
}

// Formatea un monto (ya en la moneda destino) con simbolo y locale es-VE.
export function formatMoney(value: number, currencyCode: string, symbol: string): string {
  if (currencyCode === "VES") {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return `${symbol} ${value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
