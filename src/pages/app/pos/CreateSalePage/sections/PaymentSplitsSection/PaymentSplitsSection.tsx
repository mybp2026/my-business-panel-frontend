import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CashDrawerStatus } from "@/components/ui/CashDrawerStatus";

import { formatAmount, round2 } from "../../create-sale.constants";
import type { PaymentSplitsSectionProps } from "./PaymentSplitsSectionProps";

export function PaymentSplitsSection({
  step,
  paymentSplits,
  isPartialPayment,
  onTogglePartialPayment,
  usePoints,
  pointsToRedeem,
  pointsRate,
  availablePoints,
  paymentOptions,
  onUpdateSplit,
  onFillRemainder,
  splitTotalInSaleCurrency,
  targetPayment,
  paymentBalance,
  paymentCurrenciesUsed,
  currencySymbol,
}: PaymentSplitsSectionProps) {
  if (step !== "items") return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-semibold">
            3
          </span>
          <h2 className="text-lg font-semibold text-gray-900">
            Métodos de pago
          </h2>
        </div>
        <CashDrawerStatus />
      </div>

      {!usePoints && (
        <label className="flex items-center gap-3 cursor-pointer mb-6 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <input
            type="checkbox"
            checked={isPartialPayment}
            onChange={(e) => onTogglePartialPayment(e.target.checked)}
            disabled={usePoints}
            className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span
            className={`text-sm font-medium ${usePoints ? "text-gray-500" : "text-gray-700"}`}
          >
            Pago por partes
          </span>
        </label>
      )}

      {usePoints ? (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-700 mt-1">
                Se pagará todo el total con puntos de fidelidad
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-600">Puntos a usar</p>
              <p className="text-2xl font-bold text-purple-900">
                {pointsToRedeem.toLocaleString("es-CR")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paymentSplits.map((split, idx) => (
            <div
              key={split.id}
              className="flex flex-col md:flex-row md:items-end gap-3"
            >
              <div className="flex-1">
                <Select
                  label={idx === 0 ? "Método de pago" : undefined}
                  disabled={isPartialPayment}
                  value={String(split.methodId)}
                  onChange={(e) =>
                    onUpdateSplit(split.id, "methodId", Number(e.target.value))
                  }
                  options={paymentOptions}
                />
              </div>
              <div className="flex-1">
                {idx === 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      {Number(split.methodId) === 5
                        ? "Puntos a canjear"
                        : "Monto"}
                    </label>
                    {Number(split.methodId) === 5 &&
                    split.amount &&
                    pointsRate > 0 ? (
                      <span className="text-xs text-gray-600">
                        {(() => {
                          const pointsValue = parseFloat(split.amount);
                          const crcEquiv = round2(pointsValue / pointsRate);
                          return `≈ ${formatAmount(crcEquiv, "Bs.")}`;
                        })()}
                      </span>
                    ) : null}
                  </div>
                )}
                <Input
                  required
                  label={
                    idx !== 0
                      ? Number(split.methodId) === 5
                        ? "Puntos a canjear"
                        : "Monto"
                      : undefined
                  }
                  type="number"
                  min={0}
                  max={Number(split.methodId) === 5 ? availablePoints : undefined}
                  step={Number(split.methodId) === 5 ? "1" : "0.01"}
                  placeholder={Number(split.methodId) === 5 ? "0" : "0.00"}
                  value={
                    Number(split.methodId) === 5 &&
                    split.amount &&
                    pointsRate > 0
                      ? String(Math.round(parseFloat(split.amount) * pointsRate))
                      : split.amount
                  }
                  hint={
                    Number(split.methodId) === 5 &&
                    split.amount &&
                    parseFloat(split.amount) > 0
                      ? `Equivale a ${formatAmount(round2(parseFloat(split.amount)), "Bs.")}`
                      : undefined
                  }
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (Number(split.methodId) === 5 && pointsRate > 0) {
                      const pointsValue = parseFloat(newValue) || 0;
                      const amountInCurrency = round2(pointsValue / pointsRate);
                      onUpdateSplit(split.id, "amount", String(amountInCurrency));
                    } else {
                      onUpdateSplit(split.id, "amount", newValue);
                    }
                  }}
                />
              </div>
              <div className={`flex gap-2 ${idx === 0 ? "mb-0" : ""}`}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onFillRemainder(split.id)}
                  title="Completar con el monto pendiente"
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!usePoints && (
        <div
          className={`mt-4 flex flex-col gap-2 rounded-xl p-3 text-sm font-medium ${
            paymentBalance > 0.01
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : paymentBalance < -0.01
                ? "bg-blue-50 border border-blue-200 text-blue-800"
                : "bg-emerald-50 border border-emerald-200 text-emerald-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span>
              Total ingresado: {formatAmount(splitTotalInSaleCurrency, currencySymbol)} /{" "}
              {formatAmount(targetPayment, currencySymbol)}
            </span>
            {paymentBalance > 0.01 && (
              <span>
                Pendiente: {formatAmount(Math.abs(paymentBalance), currencySymbol)}
              </span>
            )}
            {paymentBalance < -0.01 && (
              <span>
                Vuelto: {formatAmount(Math.abs(paymentBalance), currencySymbol)}
              </span>
            )}
            {Math.abs(paymentBalance) < 0.01 && <span>Pagos cuadrados</span>}
          </div>

          {isPartialPayment && paymentCurrenciesUsed.length > 1 && (
            <div className="text-xs border-t border-current opacity-60 pt-1">
              Pago con múltiples monedas - el saldo pendiente se muestra en la
              moneda de la compra ({currencySymbol})
            </div>
          )}
        </div>
      )}
    </div>
  );
}
