import { useDisplayCurrency } from "@/context/CurrencyContext";
import { useModule } from "@/context/ModuleContext";
import { getModuleColor } from "@/config/modules";

export function CurrencyToggle() {
  const { displayCurrency, toggleDisplayCurrency } = useDisplayCurrency();
  const { currentModuleId } = useModule();
  const moduleColor = getModuleColor(currentModuleId);

  return (
    <button
      type="button"
      onClick={toggleDisplayCurrency}
      title="Alternar moneda visualizada"
      className="cursor-pointer flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-1 py-1 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100"
    >
      <span
        className={`w-8 rounded-full px-2 py-0.5 text-center transition-colors ${
          displayCurrency === "USD" ? "" : "text-gray-600"
        }`}
        style={
          displayCurrency === "USD"
            ? { backgroundColor: moduleColor, color: "#fff" }
            : undefined
        }
      >
        $
      </span>
      <span
        className={`w-8 rounded-full px-2 py-0.5 text-center transition-colors ${
          displayCurrency === "VES" ? "" : "text-gray-600"
        }`}
        style={
          displayCurrency === "VES"
            ? { backgroundColor: moduleColor, color: "#fff" }
            : undefined
        }
      >
        Bs.
      </span>
    </button>
  );
}
