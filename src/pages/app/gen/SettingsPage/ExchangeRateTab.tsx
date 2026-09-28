import { ExchangeRatePanel } from "@/components/exchange-rate/ExchangeRatePanel";

/**
 * Tasa de cambio USD -> VES. El sistema es bimonetario: un solo par, una
 * sola tasa vigente. La UI multi-moneda anterior (crear/editar/borrar
 * pares arbitrarios) se retiro -- ahora es un ledger inmutable, ver
 * migrations/general/034.
 */
export function ExchangeRateTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Tasa de cambio
        </h2>
        <p className="text-sm text-gray-600">
          Bolívar y dólar son las únicas monedas del sistema. La tasa aplicada
          aquí rige todos los cálculos del tenant — ventas, compras, gastos y
          nómina.
        </p>
      </div>

      <ExchangeRatePanel />
    </div>
  );
}
