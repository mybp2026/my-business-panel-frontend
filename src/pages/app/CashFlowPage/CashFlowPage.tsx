import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { IconTrendingUp, IconCreditCard, IconCheckCircle } from "@/assets/icons";

import { financesApi } from "@/api/finances.api";
import {
  CRC_CURRENCY_ID,
  convertCurrency,
  formatMoney,
} from "@/utils/currency";

import type { CashFlowPageLoaderData } from "@/router/loaders/cashFlow.loaders";
import type {
  CashFlowBucket,
  CashFlowData,
  CashFlowGroupBy,
  CashFlowProjectionItem,
  CashFlowSummaryItem,
  CashFlowAvailableItem,
} from "@/interfaces/entities/CashFlow.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";

// ─── helpers ────────────────────────────────────────────────────────────────

function toNum(s: string | number): number {
  return parseFloat(String(s)) || 0;
}

function sumItems(
  items: (CashFlowSummaryItem | CashFlowAvailableItem)[],
  direction: "entrada" | "salida",
  targetCurrencyId: number,
  rates: ExchangeRate[],
): number {
  return items
    .filter((i) => i.direction === direction)
    .reduce(
      (acc, i) =>
        acc +
        convertCurrency(
          toNum(i.total_amount),
          Number(i.currency_id),
          targetCurrencyId,
          rates,
        ),
      0,
    );
}

interface BucketChartPoint {
  label: string;
  entradas: number;
  salidas: number;
  neto: number;
}

function formatBucketLabel(dateStr: string, groupBy: CashFlowGroupBy): string {
  const d = new Date(dateStr);
  if (groupBy === "monthly") {
    return d.toLocaleDateString("es-CR", { month: "short", year: "2-digit" });
  }
  if (groupBy === "weekly") {
    return d.toLocaleDateString("es-CR", { day: "2-digit", month: "short" });
  }
  return d.toLocaleDateString("es-CR", { day: "2-digit", month: "short" });
}

function computeChartData(
  buckets: CashFlowBucket[],
  groupBy: CashFlowGroupBy,
  targetCurrencyId: number,
  rates: ExchangeRate[],
): BucketChartPoint[] {
  const map = new Map<string, { entradas: number; salidas: number }>();

  for (const b of buckets) {
    const key = b.bucket_start;
    const existing = map.get(key) ?? { entradas: 0, salidas: 0 };
    const converted = convertCurrency(
      toNum(b.total_amount),
      Number(b.currency_id),
      targetCurrencyId,
      rates,
    );
    if (b.direction === "entrada") {
      existing.entradas += converted;
    } else {
      existing.salidas -= converted;
    }
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucketStart, { entradas, salidas }]) => ({
      label: formatBucketLabel(bucketStart, groupBy),
      entradas,
      salidas,
      neto: entradas + salidas,
    }));
}

interface DeficitPeriod {
  label: string;
  neto: number;
}

function detectDeficits(points: BucketChartPoint[]): DeficitPeriod[] {
  return points
    .filter((p) => p.neto < 0)
    .map((p) => ({ label: p.label, neto: p.neto }));
}

const GROUP_BY_OPTIONS: { value: CashFlowGroupBy; label: string }[] = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
];

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  ventas: "Ventas",
  cuentas_cobradas: "Cuentas cobradas",
  pagos_proveedores: "Pagos a proveedores",
  nomina: "Nomina",
  gastos_operativos: "Gastos operativos",
  devoluciones: "Devoluciones",
  cuentas_por_cobrar: "Cuentas por cobrar",
  cuentas_por_pagar: "Cuentas por pagar",
};

function movementLabel(type: string): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

function fmt(
  value: number,
  currency: Currency | undefined,
): string {
  return formatMoney(
    value,
    currency?.currency_code ?? "CRC",
    currency?.symbol ?? "₡",
  );
}

// ─── componentes internos ────────────────────────────────────────────────────

function TrendChart({
  points,
  currency,
}: {
  points: BucketChartPoint[];
  currency: Currency | undefined;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin datos en el periodo seleccionado
      </div>
    );
  }
  const symbol = currency?.symbol ?? "₡";
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="#9ca3af"
          tickFormatter={(v: number) => `${symbol}${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(v, name) => [
            fmt(Math.abs(Number(v)), currency),
            String(name),
          ]}
          labelStyle={{ color: "#374151" }}
        />
        <Legend />
        <Bar dataKey="entradas" name="Entradas" fill="#22c55e" opacity={0.85} />
        <Bar dataKey="salidas" name="Salidas" fill="#ef4444" opacity={0.85} />
        <Line
          type="monotone"
          dataKey="neto"
          name="Flujo neto"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ProjectionsTable({
  projections,
  currency,
  rates,
  targetCurrencyId,
}: {
  projections: CashFlowProjectionItem[];
  currency: Currency | undefined;
  rates: ExchangeRate[];
  targetCurrencyId: number;
}) {
  if (projections.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        Sin pagos ni cobros proximos registrados
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="pb-2 pr-4">Fecha</th>
            <th className="pb-2 pr-4">Tipo</th>
            <th className="pb-2 pr-4">Descripcion</th>
            <th className="pb-2 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {projections.map((p, i) => {
            const converted = convertCurrency(
              toNum(p.amount),
              Number(p.currency_id),
              targetCurrencyId,
              rates,
            );
            const isOutflow = p.direction === "salida";
            return (
              <tr
                key={i}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-600">
                  {new Date(p.projection_date).toLocaleDateString("es-CR")}
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      isOutflow
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700",
                    ].join(" ")}
                  >
                    {movementLabel(p.movement_type)}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-gray-700">{p.description}</td>
                <td
                  className={[
                    "py-2.5 text-right font-medium",
                    isOutflow ? "text-red-600" : "text-green-600",
                  ].join(" ")}
                >
                  {isOutflow ? "-" : "+"}{fmt(converted, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export function CashFlowPage() {
  const { cashFlow: initialCashFlow, projections, currencies, exchangeRates } =
    useLoaderData() as CashFlowPageLoaderData;

  const [cashFlow, setCashFlow] = useState<CashFlowData>(initialCashFlow);
  const [groupBy, setGroupBy] = useState<CashFlowGroupBy>(
    initialCashFlow.group_by ?? "daily",
  );
  const [startDate, setStartDate] = useState<string>(
    initialCashFlow.start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
  );
  const [endDate, setEndDate] = useState<string>(
    initialCashFlow.end_date || new Date().toISOString().slice(0, 10),
  );
  const [selectedCurrencyId, setSelectedCurrencyId] = useState(CRC_CURRENCY_ID);
  const [loading, setLoading] = useState(false);

  const currency = currencies.find(
    (c) => Number(c.currency_id) === selectedCurrencyId,
  );

  async function fetchData(params: {
    startDate: string;
    endDate: string;
    groupBy: CashFlowGroupBy;
  }) {
    setLoading(true);
    try {
      const data = await financesApi.getCashFlow(params);
      setCashFlow(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleGroupByChange(value: string) {
    const next = value as CashFlowGroupBy;
    setGroupBy(next);
    await fetchData({ startDate, endDate, groupBy: next });
  }

  async function handleDateChange(
    field: "startDate" | "endDate",
    value: string,
  ) {
    const nextStart = field === "startDate" ? value : startDate;
    const nextEnd = field === "endDate" ? value : endDate;
    if (field === "startDate") setStartDate(value);
    else setEndDate(value);
    await fetchData({ startDate: nextStart, endDate: nextEnd, groupBy });
  }

  // KPI cards
  const totalInflows = useMemo(
    () => sumItems(cashFlow.summary, "entrada", selectedCurrencyId, exchangeRates),
    [cashFlow.summary, selectedCurrencyId, exchangeRates],
  );
  const totalOutflows = useMemo(
    () => sumItems(cashFlow.summary, "salida", selectedCurrencyId, exchangeRates),
    [cashFlow.summary, selectedCurrencyId, exchangeRates],
  );
  const netFlow = totalInflows - totalOutflows;

  const availableInflows = useMemo(
    () =>
      sumItems(cashFlow.available_cash, "entrada", selectedCurrencyId, exchangeRates),
    [cashFlow.available_cash, selectedCurrencyId, exchangeRates],
  );
  const availableOutflows = useMemo(
    () =>
      sumItems(cashFlow.available_cash, "salida", selectedCurrencyId, exchangeRates),
    [cashFlow.available_cash, selectedCurrencyId, exchangeRates],
  );
  const availableCash = availableInflows - availableOutflows;

  // Chart
  const chartPoints = useMemo(
    () =>
      computeChartData(cashFlow.buckets, groupBy, selectedCurrencyId, exchangeRates),
    [cashFlow.buckets, groupBy, selectedCurrencyId, exchangeRates],
  );

  const deficits = useMemo(() => detectDeficits(chartPoints), [chartPoints]);

  // Breakdown table (period summary by movement type)
  const breakdownRows = useMemo(() => {
    const byType = new Map<
      string,
      { direction: string; amount: number }
    >();
    for (const item of cashFlow.summary) {
      const key = `${item.direction}:${item.movement_type}`;
      const existing = byType.get(key) ?? {
        direction: item.direction,
        amount: 0,
      };
      existing.amount += convertCurrency(
        toNum(item.total_amount),
        Number(item.currency_id),
        selectedCurrencyId,
        exchangeRates,
      );
      byType.set(key, existing);
    }
    return Array.from(byType.entries()).map(([key, val]) => ({
      key,
      movement_type: key.split(":")[1],
      direction: val.direction as "entrada" | "salida",
      amount: val.amount,
    }));
  }, [cashFlow.summary, selectedCurrencyId, exchangeRates]);

  return (
    <div className="p-6 lg:p-8">
      {/* Hero */}
      <section className="mb-6 rounded-4xl p-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-700">
            Finanzas
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
            Flujo de Caja
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Movimiento real de efectivo: entradas, salidas, flujo neto y
            proyecciones futuras del negocio.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">Desde</p>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => void handleDateChange("startDate", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">Hasta</p>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => void handleDateChange("endDate", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
        <div className="w-44">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Agrupacion</p>
          <Select
            value={groupBy}
            onChange={(e) => void handleGroupByChange(e.target.value)}
            options={GROUP_BY_OPTIONS}
          />
        </div>
        {currencies.length > 1 && (
          <div className="w-56">
            <p className="mb-1.5 text-sm font-medium text-gray-700">
              Mostrar en
            </p>
            <Select
              value={String(selectedCurrencyId)}
              onChange={(e) =>
                setSelectedCurrencyId(Number(e.target.value))
              }
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

      {/* KPI Cards */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total entradas"
          value={fmt(totalInflows, currency)}
          icon={<IconTrendingUp />}
          sublabel="Ingresos del periodo"
        />
        <StatCard
          label="Total salidas"
          value={fmt(totalOutflows, currency)}
          icon={<IconCreditCard />}
          sublabel="Egresos del periodo"
        />
        <StatCard
          label="Flujo de caja neto"
          value={fmt(netFlow, currency)}
          icon={<IconCreditCard />}
          sublabel="Entradas menos salidas"
          accent={netFlow >= 0}
        />
        <StatCard
          label="Efectivo disponible"
          value={fmt(availableCash, currency)}
          icon={<IconCheckCircle />}
          sublabel="Acumulado historico"
        />
      </section>

      {/* Tendencia */}
      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          Tendencia del flujo de caja
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Entradas (verde), salidas (rojo) y flujo neto (azul) por periodo.
        </p>
        <TrendChart points={chartPoints} currency={currency} />
      </section>

      {/* Desglose por tipo de movimiento */}
      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Desglose del periodo
        </h2>
        {breakdownRows.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Sin movimientos en el periodo
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-4">Tipo de movimiento</th>
                  <th className="pb-2 pr-4">Direccion</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdownRows
                  .sort((a, b) => b.amount - a.amount)
                  .map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="py-2.5 pr-4 text-gray-700">
                        {movementLabel(row.movement_type)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            row.direction === "salida"
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-green-700",
                          ].join(" ")}
                        >
                          {row.direction === "salida" ? "Salida" : "Entrada"}
                        </span>
                      </td>
                      <td
                        className={[
                          "py-2.5 text-right font-medium",
                          row.direction === "salida"
                            ? "text-red-600"
                            : "text-green-600",
                        ].join(" ")}
                      >
                        {fmt(row.amount, currency)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Deficits detectados */}
      {deficits.length > 0 && (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-1 text-base font-semibold text-red-800">
            Deficits de caja detectados
          </h2>
          <p className="mb-4 text-sm text-red-600">
            Periodos en los que los egresos superaron los ingresos.
          </p>
          <div className="flex flex-wrap gap-2">
            {deficits.map((d) => (
              <div
                key={d.label}
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-medium text-red-700">{d.label}</span>
                <span className="ml-2 text-red-500">
                  {fmt(d.neto, currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Proyecciones y pagos proximos */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Proyecciones y pagos proximos
            </h2>
            <p className="text-sm text-gray-500">
              Movimientos futuros conocidos: CxC, CxP y nomina pendiente.
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              Entradas
            </span>
            <span className="flex items-center gap-1.5 text-red-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              Salidas
            </span>
          </div>
        </div>
        <ProjectionsTable
          projections={projections.projections}
          currency={currency}
          rates={exchangeRates}
          targetCurrencyId={selectedCurrencyId}
        />
      </section>
    </div>
  );
}
