import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";

/** Indicador compacto de tasa USD -> VES vigente, para esquina superior
 *  derecha de las pantallas del modulo de Finanzas. */
export function FinanceRateBadge() {
  const rate = useCurrentExchangeRate();

  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shrink-0">
      <span className="text-gray-400">USD → VES</span>
      <span className="font-semibold text-gray-900">
        {rate === null ? "—" : rate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
