/**
 * El dolar es la unidad base del sistema (spec Venezuela): el catalogo de
 * productos y todos los montos monetarios que persisten (sale.total_amount,
 * account_receivable.subtotal, credit_debit_note.amount, etc.) se guardan
 * en bolivares (moneda funcional), pero SIEMPRE deben mostrarse con el
 * equivalente en dolares como cifra principal, y el monto en bolivares como
 * conversion en paralelo segun la tasa vigente del tenant.
 */

export const formatUsd = (value: number): string =>
  `$ ${value.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

export const formatBs = (value: number): string =>
  `Bs. ${value.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

/** Convierte un monto en bolivares (moneda base persistida) a su
 *  equivalente en dolares usando la tasa vigente. Null si no hay tasa. */
export const bsToUsd = (
  amountBs: number,
  rate: number | null | undefined,
): number | null => {
  if (!rate || rate <= 0) return null;
  return Math.round((amountBs / rate) * 100) / 100;
};
