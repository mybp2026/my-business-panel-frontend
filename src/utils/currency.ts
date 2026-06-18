import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

export const CRC_CURRENCY_ID = 1;

// Tasa de una moneda a CRC. Busca directa, luego inversa.
export function getExchangeRateToCrc(
  rates: ExchangeRate[],
  fromCurrencyId: number,
): number | null {
  if (fromCurrencyId === CRC_CURRENCY_ID) return 1;
  const direct = rates.find(
    (r) =>
      Number(r.from_currency_id) === fromCurrencyId &&
      Number(r.to_currency_id) === CRC_CURRENCY_ID,
  );
  if (direct) return Number(direct.rate);
  const rev = rates.find(
    (r) =>
      Number(r.from_currency_id) === CRC_CURRENCY_ID &&
      Number(r.to_currency_id) === fromCurrencyId,
  );
  if (rev && Number(rev.rate) > 0) return 1 / Number(rev.rate);
  return null;
}

// Convierte un monto en CRC a la moneda destino.
export function convertFromCrc(
  amountCrc: number,
  targetCurrencyId: number,
  rates: ExchangeRate[],
): number | null {
  if (targetCurrencyId === CRC_CURRENCY_ID) return amountCrc;
  const toTarget = rates.find(
    (r) =>
      Number(r.from_currency_id) === CRC_CURRENCY_ID &&
      Number(r.to_currency_id) === targetCurrencyId,
  );
  if (toTarget) return amountCrc * Number(toTarget.rate);
  const toCrc = getExchangeRateToCrc(rates, targetCurrencyId);
  if (toCrc && toCrc > 0) return amountCrc / toCrc;
  return null;
}

// Convierte un monto entre dos monedas cualesquiera (via CRC como pivote).
// Si falta la tasa, cae al monto original (1:1) para no producir NaN.
export function convertCurrency(
  amount: number,
  fromCurrencyId: number,
  toCurrencyId: number,
  rates: ExchangeRate[],
): number {
  if (!amount) return 0;
  if (fromCurrencyId === toCurrencyId) return amount;
  const inCrc =
    fromCurrencyId === CRC_CURRENCY_ID
      ? amount
      : (getExchangeRateToCrc(rates, fromCurrencyId) ?? 1) * amount;
  const converted = convertFromCrc(inCrc, toCurrencyId, rates);
  return converted ?? inCrc;
}

// Formatea un monto (ya en la moneda destino) con simbolo y locale es-CR.
export function formatMoney(value: number, currencyCode: string, symbol: string): string {
  if (currencyCode === "CRC") {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return `${symbol} ${value.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
