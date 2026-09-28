import { round2, formatAmount } from "../../create-sale.constants";
import type { LoyaltyPointsSectionProps } from "./LoyaltyPointsSectionProps";

export function LoyaltyPointsSection({
  step,
  loyaltyActive,
  availablePoints,
  pointsRate,
  maxPointsCrcValue,
  convertCrcToSaleCurrency,
  currencySymbol,
  usePoints,
  pointsCoveredDisplay,
  pointsToRedeem,
  totalAmount,
  onToggleUsePoints,
}: LoyaltyPointsSectionProps) {
  if (!loyaltyActive || step !== "items") return null;

  const pointsNeededForTotal =
    loyaltyActive && pointsRate > 0 ? round2(totalAmount * pointsRate) : 0;
  const hasEnoughPointsForTotal =
    pointsNeededForTotal > 0 && pointsNeededForTotal <= availablePoints;

  return (
    <div className="bg-white rounded-2xl border border-purple-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Puntos de fidelidad
        </h2>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wider text-purple-600">
              Puntos disponibles
            </p>
            <p className="text-2xl font-bold text-purple-900 mt-0.5">
              {availablePoints.toLocaleString("es-CR")}
            </p>
            <p className="text-xs text-purple-700 mt-0.5">
              Equivalen a{" "}
              {formatAmount(
                convertCrcToSaleCurrency(maxPointsCrcValue),
                currencySymbol,
              )}
            </p>
          </div>
          {usePoints && pointsCoveredDisplay > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs uppercase tracking-wider text-emerald-600">
                Cubierto por puntos
              </p>
              <p className="text-2xl font-bold text-emerald-900 mt-0.5">
                {formatAmount(round2(pointsToRedeem / pointsRate), "Bs.")}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Puntos restantes tras compra:{" "}
                {(availablePoints - pointsToRedeem).toLocaleString("es-CR")}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 min-w-55">
          {hasEnoughPointsForTotal && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => onToggleUsePoints(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
              />
              <span className="text-sm font-medium text-gray-700">
                Usar puntos para pagar
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
