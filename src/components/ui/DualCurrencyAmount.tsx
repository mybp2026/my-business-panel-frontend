import { bsToUsd, formatBs, formatUsd, usdToBs } from "@/utils/dualCurrency";
import { useDisplayCurrency } from "@/context/CurrencyContext";

interface DualCurrencyAmountBaseProps {
  /** Tasa USD -> Bs. vigente del tenant. Null/0 = sin tasa cargada. */
  rate: number | null;
  bold?: boolean;
  align?: "left" | "right";
  /** Clases del wrapper (layout: margenes, etc). */
  className?: string;
  /** Clases de color/peso para la cifra principal (default gris). */
  amountClassName?: string;
  /** Oculta la linea de conversion "≈" -- solo la moneda seleccionada. */
  hideSecondary?: boolean;
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
 * Celda de tabla / linea de resumen para mostrar un monto monetario en
 * dolares y bolivares. Cual de las dos es la cifra principal (grande,
 * arriba) depende del toggle universal de moneda (header, ver
 * CurrencyContext) -- no de este componente. Acepta el monto ya persistido
 * en Bs. (Ventas) o ya persistido en USD (Compras/CxP), nunca ambos.
 */
export function DualCurrencyAmount({
  rate,
  bold = false,
  align = "left",
  className = "",
  amountClassName,
  hideSecondary = false,
  ...props
}: DualCurrencyAmountProps) {
  const { displayCurrency } = useDisplayCurrency();

  const usd = "amountUsd" in props && props.amountUsd !== undefined
    ? props.amountUsd
    : bsToUsd(props.amountBs as number, rate);
  const bs = "amountUsd" in props && props.amountUsd !== undefined
    ? usdToBs(props.amountUsd, rate)
    : (props.amountBs as number);

  const primary = displayCurrency === "VES" ? bs : usd;
  const secondary = displayCurrency === "VES" ? usd : bs;
  const formatPrimary = displayCurrency === "VES" ? formatBs : formatUsd;
  const formatSecondary = displayCurrency === "VES" ? formatUsd : formatBs;

  return (
    <div className={`${align === "right" ? "text-right" : ""} ${className}`}>
      <div
        className={
          amountClassName ?? (bold ? "font-semibold text-gray-900" : "text-gray-900")
        }
      >
        {primary !== null ? formatPrimary(primary) : "—"}
      </div>
      {!hideSecondary && (
        <div className="text-xs text-gray-500">
          {secondary !== null
            ? `≈ ${formatSecondary(secondary)}`
            : "Sin tasa configurada"}
        </div>
      )}
    </div>
  );
}
