import { useState, useEffect, useCallback } from "react";
import { useLoaderData } from "react-router-dom";
import { fnzIvaApi } from "@/api/fnzIva.api";
import {
  TimeIntervalSelector,
  intervalToDates,
} from "@/components/ui/TimeIntervalSelector";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { formatInCurrency, convertAmount } from "@/utils/purchase";

import type { TimeInterval } from "@/components/ui/TimeIntervalSelector";
import type { IvaSummary } from "@/interfaces/entities/FnzIva.interface";
import type { FnzIvaPageLoaderData } from "@/router/loaders/fnzIva.loaders";
import type { Currency } from "@/interfaces/entities/Currency.interface";

const CRC_CURRENCY_ID = 1;

function IvaStat({
  label,
  value,
  description,
  tone = "neutral",
  loading,
}: {
  label: string;
  value: string;
  description?: string;
  tone?: "blue" | "green" | "yellow" | "gray" | "neutral";
  loading: boolean;
}) {
  const toneClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-amber-50 border-amber-200 text-amber-700",
    gray: "bg-gray-50 border-gray-200 text-gray-600",
    neutral: "bg-white border-gray-200 text-gray-800",
  };

  return (
    <div className={`rounded-xl border p-5 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold">
        {loading ? <span className="animate-pulse">...</span> : value}
      </p>
      {description && (
        <p className="text-xs mt-1 opacity-60">{description}</p>
      )}
    </div>
  );
}

export function FnzIvaPage() {
  const { tenantId, currencies, exchangeRates } =
    useLoaderData() as FnzIvaPageLoaderData;

  const crcCurrency =
    currencies.find((c) => c.currency_code === "CRC") ?? currencies[0];

  const [displayCurrency, setDisplayCurrency] = useState<Currency>(
    crcCurrency ?? currencies[0],
  );
  const [interval, setInterval] = useState<TimeInterval>("30d");
  const [summary, setSummary] = useState<IvaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { start, end } = intervalToDates(interval);
    try {
      const data = await fnzIvaApi.getSummary(tenantId, start, end);
      setSummary(data);
    } catch {
      // Mantener datos anteriores en caso de error
    } finally {
      setLoading(false);
    }
  }, [tenantId, interval]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const convert = useCallback(
    (amount: number) =>
      convertAmount(amount, CRC_CURRENCY_ID, displayCurrency.currency_id, exchangeRates),
    [displayCurrency, exchangeRates],
  );

  const fmt = (amount: number) =>
    loading ? "..." : formatInCurrency(convert(amount), displayCurrency);

  const ivaNeto = summary?.iva_neto ?? 0;
  const isDebt = ivaNeto > 0;

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IVA del Período</h1>
          <p className="text-gray-500 text-sm mt-1">
            Desglose de impuesto al valor agregado para la declaración a Hacienda CR
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeIntervalSelector value={interval} onChange={setInterval} />
          {currencies.length > 0 && (
            <CurrencyToggle
              currencies={currencies}
              value={displayCurrency}
              onChange={setDisplayCurrency}
            />
          )}
        </div>
      </div>

      {/* Fila 1: IVA Débito, Recuperable y Notas de Crédito */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <IvaStat
          label="IVA Débito (Ventas)"
          value={fmt(summary?.iva_debito ?? 0)}
          description="IVA cobrado en ventas con factura aceptada por Hacienda"
          tone="blue"
          loading={loading}
        />
        <IvaStat
          label="IVA Recuperable (Compras)"
          value={fmt(summary?.iva_recuperable ?? 0)}
          description="Crédito fiscal de compras (pagadas + CxP pendiente)"
          tone="green"
          loading={loading}
        />
        <IvaStat
          label="IVA Notas de Crédito"
          value={fmt(summary?.iva_notas_credito ?? 0)}
          description="IVA revertido por devoluciones de ventas"
          tone="gray"
          loading={loading}
        />
      </div>

      {/* Fila 2: Desglose compras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IvaStat
          label="IVA Crédito — Compras Pagadas"
          value={fmt(summary?.iva_credito ?? 0)}
          description="IVA de compras con factura y pago completados"
          tone="green"
          loading={loading}
        />
        <IvaStat
          label="IVA CxP — Pago Pendiente"
          value={fmt(summary?.iva_cxp ?? 0)}
          description="IVA acreditable de facturas recibidas con pago aún pendiente"
          tone="yellow"
          loading={loading}
        />
      </div>

      {/* IVA Neto — tarjeta de resultado principal */}
      <div
        className={`rounded-2xl border-2 p-6 ${
          isDebt
            ? "bg-red-50 border-red-300"
            : "bg-green-50 border-green-300"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
              IVA Neto a declarar a Hacienda
            </p>
            <p
              className={`text-4xl font-bold ${
                isDebt ? "text-red-700" : "text-green-700"
              }`}
            >
              {loading
                ? "..."
                : formatInCurrency(
                    convert(Math.abs(ivaNeto)),
                    displayCurrency,
                  )}
            </p>
            <p
              className={`text-sm mt-2 font-semibold ${
                isDebt ? "text-red-600" : "text-green-600"
              }`}
            >
              {isDebt
                ? "Deuda con Hacienda CR — monto a pagar"
                : "Saldo a favor — aplicar en el siguiente período"}
            </p>
          </div>

          {/* Fórmula explicativa */}
          <div className="text-xs text-gray-500 space-y-1 bg-white/60 rounded-xl px-4 py-3 min-w-[220px]">
            <p className="font-semibold text-gray-600 mb-2">Cálculo</p>
            <p>
              IVA Débito ajustado:{" "}
              <span className="font-medium text-gray-800">
                {fmt(summary?.iva_debito_ajustado ?? 0)}
              </span>
            </p>
            <p className="text-gray-400 text-[10px]">
              (Débito − Notas de Crédito)
            </p>
            <hr className="border-gray-200 my-1" />
            <p>
              IVA Recuperable:{" "}
              <span className="font-medium text-gray-800">
                {fmt(summary?.iva_recuperable ?? 0)}
              </span>
            </p>
            <p className="text-gray-400 text-[10px]">
              (Crédito compras + CxP)
            </p>
            <hr className="border-gray-200 my-1" />
            <p className={`font-semibold ${isDebt ? "text-red-600" : "text-green-600"}`}>
              Neto:{" "}
              {loading
                ? "..."
                : `${isDebt ? "" : "−"}${formatInCurrency(
                    convert(Math.abs(ivaNeto)),
                    displayCurrency,
                  )}`}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer tipo de cambio */}
      {exchangeRates.length === 0 && currencies.length > 1 && (
        <p className="text-xs text-amber-600 text-center">
          Sin tasas de cambio configuradas — los montos se muestran sin conversión.
        </p>
      )}
    </div>
  );
}
