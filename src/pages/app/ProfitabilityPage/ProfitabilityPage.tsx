import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { IconTrendingUp, IconCreditCard, IconCheckCircle } from "@/assets/icons";

import { profitabilityApi } from "@/api/profitability.api";
import { computeProfitability } from "@/helpers/profitability";
import { CRC_CURRENCY_ID, formatMoney } from "@/utils/currency";
import {
  DEFAULT_PROFITABILITY_INTERVAL,
  PROFITABILITY_INTERVAL_OPTIONS,
} from "@/constants/profitability";

import type { ProfitabilityPageLoaderData } from "@/router/loaders/profitability.loaders";
import type {
  ProfitabilityInterval,
  ProfitabilityRawData,
  ProfitabilitySeries,
} from "@/interfaces/entities/Profitability.interface";

function fmtPct(value: number): string {
  return `${value.toFixed(2)} %`;
}

// Grafico de lineas de margen bruto y neto para una serie.
function MarginChart({
  points,
}: {
  points: ProfitabilitySeries["points"];
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin datos en el periodo seleccionado
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          formatter={(v, name) => [fmtPct(Number(v)), String(name)]}
          labelStyle={{ color: "#374151" }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="mb_pct"
          name="Margen bruto"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="mn_pct"
          name="Margen neto"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ProfitabilityPage() {
  const { raw: initialRaw, currencies, exchangeRates, currentTenantName } =
    useLoaderData() as ProfitabilityPageLoaderData;

  const [raw, setRaw] = useState<ProfitabilityRawData>(initialRaw);
  const [interval, setInterval] = useState<ProfitabilityInterval>(
    initialRaw.interval ?? DEFAULT_PROFITABILITY_INTERVAL,
  );
  const [selectedCurrencyId, setSelectedCurrencyId] = useState(CRC_CURRENCY_ID);
  const [loading, setLoading] = useState(false);

  // Cambio de intervalo -> re-fetch al backend (regla del repo: filtros re-consultan).
  async function handleIntervalChange(value: string) {
    const next = value as ProfitabilityInterval;
    setInterval(next);
    setLoading(true);
    try {
      setRaw(await profitabilityApi.getProfitability(next));
    } finally {
      setLoading(false);
    }
  }

  const currency =
    currencies.find((c) => Number(c.currency_id) === selectedCurrencyId) ??
    currencies[0];

  // Cambio de moneda NO re-consulta: el pipeline recalcula con las tasas cargadas.
  const result = useMemo(
    () => computeProfitability(raw, selectedCurrencyId, exchangeRates),
    [raw, selectedCurrencyId, exchangeRates],
  );

  const fmt = (value: number) =>
    formatMoney(value, currency?.currency_code ?? "CRC", currency?.symbol ?? "₡");

  return (
    <div className="p-6 lg:p-8">
      {/* Hero */}
      <section className="mb-6 rounded-4xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-700">
              Finanzas
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Rentabilidad
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Utilidad bruta y neta, margenes y aporte por sucursal en el
              periodo seleccionado.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Contexto principal
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {currentTenantName}
            </p>
          </div>
        </div>
      </section>

      {/* Filtros: intervalo (re-fetch) + moneda (recalculo local) */}
      <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div className="w-64">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Intervalo</p>
          <Select
            value={interval}
            onChange={(e) => void handleIntervalChange(e.target.value)}
            options={PROFITABILITY_INTERVAL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </div>
        {currencies.length > 1 && (
          <div className="w-64">
            <p className="mb-1.5 text-sm font-medium text-gray-700">
              Mostrar montos en
            </p>
            <Select
              value={String(selectedCurrencyId)}
              onChange={(e) => setSelectedCurrencyId(Number(e.target.value))}
              options={currencies.map((c) => ({
                value: String(c.currency_id),
                label: `${c.currency_code} — ${c.currency_name}`,
              }))}
            />
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-200 border-t-accent-500" />
            Actualizando...
          </div>
        )}
      </section>

      {/* Resumen general */}
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Ventas netas (VN)"
          value={fmt(result.general.total_vn)}
          icon={<IconCreditCard />}
          sublabel="Ventas - descuentos - devoluciones"
        />
        <StatCard
          label="Utilidad bruta (UB)"
          value={fmt(result.general.total_ub)}
          icon={<IconTrendingUp />}
          sublabel="Ingresos menos costo de ventas"
        />
        <StatCard
          label="Utilidad neta (UN)"
          value={fmt(result.general.total_un)}
          icon={<IconCheckCircle />}
          sublabel="Utilidad bruta menos gastos"
          accent
        />
      </section>

      {/* Grafico general (todas las sucursales) */}
      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          Rentabilidad general
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Margen bruto y neto consolidado de todas las sucursales.
        </p>
        <MarginChart points={result.general.points} />
      </section>

      {/* Graficos por sucursal */}
      <section className="grid gap-6 xl:grid-cols-2">
        {result.branches.map((branch) => (
          <div
            key={branch.branch_id}
            className="rounded-3xl border border-gray-200 bg-white p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {branch.branch_name}
                </h2>
                <p className="text-sm text-gray-500">
                  UN: {fmt(branch.total_un)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Aporte (AS)
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {fmtPct(branch.contribution_pct)}
                </p>
              </div>
            </div>
            <MarginChart points={branch.points} />
          </div>
        ))}
      </section>
    </div>
  );
}
