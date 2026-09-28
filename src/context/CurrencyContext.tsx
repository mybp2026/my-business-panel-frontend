import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type DisplayCurrency = "USD" | "VES";

const STORAGE_KEY = "mbp_display_currency";

// IDs de general_schema.currency (seeds/catalog/general/006-insert-currencies.sql).
export const DISPLAY_CURRENCY_ID: Record<DisplayCurrency, number> = {
  VES: 1,
  USD: 2,
};

interface CurrencyContextValue {
  /** Moneda que el usuario eligio ver en toda la app. Default: USD. */
  displayCurrency: DisplayCurrency;
  displayCurrencyId: number;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  toggleDisplayCurrency: () => void;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
  undefined,
);

function readInitialCurrency(): DisplayCurrency {
  try {
    return localStorage.getItem(STORAGE_KEY) === "VES" ? "VES" : "USD";
  } catch {
    return "USD";
  }
}

/**
 * Preferencia global de moneda visualizada (USD/VES), persistida por
 * dispositivo en localStorage. El dolar es la unidad base del sistema
 * (spec Venezuela) -- default USD si no hay preferencia guardada.
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(
    readInitialCurrency,
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, displayCurrency);
    } catch {
      // localStorage puede fallar (modo privado, cuota) -- la preferencia
      // queda solo en memoria para esta sesion, no rompe la app.
    }
  }, [displayCurrency]);

  const value: CurrencyContextValue = {
    displayCurrency,
    displayCurrencyId: DISPLAY_CURRENCY_ID[displayCurrency],
    setDisplayCurrency: setDisplayCurrencyState,
    toggleDisplayCurrency: () =>
      setDisplayCurrencyState((prev) => (prev === "USD" ? "VES" : "USD")),
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error(
      "useDisplayCurrency debe usarse dentro de <CurrencyProvider>",
    );
  }
  return ctx;
}
