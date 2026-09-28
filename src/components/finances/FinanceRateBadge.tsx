import { useNavigate } from "react-router-dom";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";

/** Indicador compacto de tasa USD -> VES vigente, para esquina superior
 *  derecha de las pantallas del modulo de Finanzas. Lleva a la pestana
 *  de tasa de cambio en Configuracion. */
export function FinanceRateBadge() {
  const rate = useCurrentExchangeRate();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/app/settings?tab=exchange_rate")}
      className="lg:flex hidden items-center cursor-pointer gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shrink-0"
    >
      <span className="text-gray-400">USD → VES</span>
      <span className="font-semibold text-gray-900">
        {rate === null
          ? "—"
          : rate.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
        Bs.
      </span>
    </button>
  );
}
