import { Input } from "@/components/ui/Input";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";

import { formatAmount } from "../../create-sale.constants";
import type { CreditApartadoSectionProps } from "./CreditApartadoSectionProps";

export function CreditApartadoSection({
  step,
  isCredit,
  isApartado,
  dueDate,
  onDueDateChange,
  paymentBalance,
  currencySymbol,
  totalAmountDisplay,
  apartadoAmountDisplay,
  apartadoBalance,
  effectiveExchangeRate,
}: CreditApartadoSectionProps) {
  if (step !== "items" || (!isCredit && !isApartado)) return null;

  if (isCredit) {
    return (
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-semibold text-sm">
            C
          </span>
          <h2 className="text-lg font-semibold text-blue-900">
            Venta a crédito
          </h2>
        </div>
        <p className="text-sm text-blue-800 mb-4">
          El saldo pendiente se registrará como cuenta por cobrar al procesar
          la venta.
        </p>
        <Input
          label="Fecha límite de pago"
          type="date"
          value={dueDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => onDueDateChange(e.target.value)}
          hint="Fecha en que el cliente debe liquidar el saldo"
          required
        />
        {paymentBalance > 0.01 && (
          <div className="mt-3 text-sm text-blue-700">
            Saldo pendiente que se registrará en cuentas por cobrar:
            <DualCurrencyAmount
              amountBs={paymentBalance}
              rate={effectiveExchangeRate}
              bold
              className="mt-1"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-semibold text-sm">
          A
        </span>
        <h2 className="text-lg font-semibold text-amber-900">
          Venta en apartado
        </h2>
      </div>
      <p className="text-sm text-amber-800 mb-4">
        Registre el abono inicial en la sección de métodos de pago. La
        mercancía queda reservada y el saldo restante se liquida en un pago
        futuro.
      </p>
      <Input
        label="Fecha límite de pago"
        type="date"
        value={dueDate}
        onChange={(e) => onDueDateChange(e.target.value)}
        min={new Date().toISOString().slice(0, 10)}
        hint="Fecha en que el cliente debe liquidar el saldo"
        required
      />
      <div className="mt-4 bg-white rounded-xl border border-amber-200 p-4">
        <p className="text-xs uppercase tracking-wider text-amber-700">
          Saldo pendiente
        </p>
        <div className="mt-1">
          <DualCurrencyAmount
            amountBs={Math.max(apartadoBalance, 0)}
            rate={effectiveExchangeRate}
            bold
          />
        </div>
        <p className="text-xs text-amber-700 mt-2">
          Total: {formatAmount(totalAmountDisplay, currencySymbol)} · Abono
          ingresado: {formatAmount(apartadoAmountDisplay, currencySymbol)}
        </p>
      </div>
    </div>
  );
}
