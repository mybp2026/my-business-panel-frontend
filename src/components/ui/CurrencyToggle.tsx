import type { Currency } from "@/interfaces/entities/Currency.interface";

interface Props {
  currencies: Currency[];
  value: Currency;
  onChange: (currency: Currency) => void;
}

export function CurrencyToggle({ currencies, value, onChange }: Props) {
  const handleClick = () => {
    if (currencies.length <= 1) return;
    const idx = currencies.findIndex(
      (c) => c.currency_id === value.currency_id,
    );
    onChange(currencies[(idx + 1) % currencies.length]);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Cambiar moneda de visualización"
      className="px-3 py-1 text-sm rounded-full border border-gray-300 bg-white hover:border-red-400 transition-colors font-mono"
    >
      {value.symbol} {value.currency_code}
    </button>
  );
}
