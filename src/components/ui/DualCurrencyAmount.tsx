import { bsToUsd, formatBs, formatUsd } from "@/utils/dualCurrency";

interface DualCurrencyAmountProps {
  /** Monto en bolivares (moneda base en la que persiste todo el sistema). */
  amountBs: number;
  /** Tasa USD -> Bs. vigente del tenant. Null/0 = sin tasa cargada. */
  rate: number | null;
  bold?: boolean;
  align?: "left" | "right";
  /** Clases del wrapper (layout: margenes, etc). */
  className?: string;
  /** Clases de color/peso para la cifra principal en USD (default gris). */
  amountClassName?: string;
}

/**
 * Celda de tabla / linea de resumen para mostrar un monto monetario del
 * modulo de ventas: dolares como cifra principal (unidad base del sistema),
 * bolivares como equivalente en paralelo segun la tasa vigente.
 */
export function DualCurrencyAmount({
  amountBs,
  rate,
  bold = false,
  align = "left",
  className = "",
  amountClassName,
}: DualCurrencyAmountProps) {
  const usd = bsToUsd(amountBs, rate);
  return (
    <div className={`${align === "right" ? "text-right" : ""} ${className}`}>
      <div
        className={
          amountClassName ?? (bold ? "font-semibold text-gray-900" : "text-gray-900")
        }
      >
        {usd !== null ? formatUsd(usd) : "—"}
      </div>
      <div className="text-xs text-gray-500">
        {usd !== null ? `≈ ${formatBs(amountBs)}` : "Sin tasa configurada"}
      </div>
    </div>
  );
}
