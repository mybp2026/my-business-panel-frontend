import { bsToUsd, formatBs, formatUsd, usdToBs } from "@/utils/dualCurrency";

interface DualCurrencyAmountBaseProps {
  /** Tasa USD -> Bs. vigente del tenant. Null/0 = sin tasa cargada. */
  rate: number | null;
  bold?: boolean;
  align?: "left" | "right";
  /** Clases del wrapper (layout: margenes, etc). */
  className?: string;
  /** Clases de color/peso para la cifra principal en USD (default gris). */
  amountClassName?: string;
}

type DualCurrencyAmountProps =
  | (DualCurrencyAmountBaseProps & {
      /** Monto en bolivares (moneda base de Ventas -- se convierte a USD). */
      amountBs: number;
      amountUsd?: never;
    })
  | (DualCurrencyAmountBaseProps & {
      /** Monto en dolares (moneda base de Compras/CxP -- se convierte a Bs). */
      amountUsd: number;
      amountBs?: never;
    });

/**
 * Celda de tabla / linea de resumen para mostrar un monto monetario:
 * dolares como cifra principal (unidad base del sistema), bolivares como
 * equivalente en paralelo segun la tasa vigente. Acepta el monto ya
 * persistido en Bs. (Ventas) o ya persistido en USD (Compras/CxP) -- solo
 * uno de los dos, nunca ambos.
 */
export function DualCurrencyAmount({
  rate,
  bold = false,
  align = "left",
  className = "",
  amountClassName,
  ...props
}: DualCurrencyAmountProps) {
  const usd = "amountUsd" in props && props.amountUsd !== undefined
    ? props.amountUsd
    : bsToUsd(props.amountBs as number, rate);
  const bs = "amountUsd" in props && props.amountUsd !== undefined
    ? usdToBs(props.amountUsd, rate)
    : (props.amountBs as number);

  const hasRate = usd !== null && bs !== null;

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
        {hasRate ? `≈ ${formatBs(bs)}` : "Sin tasa configurada"}
      </div>
    </div>
  );
}
