import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import {
  IconCreditCard,
  IconTrendingUp,
  IconCheckCircle,
} from "@/assets/icons";

import { promotionApi } from "@/api/promotion.api";
import { CRC_CURRENCY_ID, convertCurrency, formatMoney } from "@/utils/currency";
import {
  DEFAULT_PROMO_INTERVAL,
  PROMO_INTERVAL_OPTIONS,
} from "@/constants/promotion";

import type { PromotionsAnalyticsLoaderData } from "@/router/loaders/promotionsAnalytics.loaders";
import type {
  PromoAnalyticsRow,
  PromoAnalyticsSummary,
  PromoInterval,
} from "@/interfaces/entities/Promotion.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

type ActiveFilter = "all" | "true" | "false";
type SortField = "total_discount" | "total_revenue" | "sale_count";
type SortDir = "asc" | "desc";

function aggregateRows(
  rows: PromoAnalyticsRow[],
  displayCurrencyId: number,
  exchangeRates: ExchangeRate[],
): PromoAnalyticsSummary[] {
  const map = new Map<string, PromoAnalyticsSummary>();

  for (const row of rows) {
    const discount = convertCurrency(
      parseFloat(row.total_discount),
      row.currency_id,
      displayCurrencyId,
      exchangeRates,
    );
    const revenue = convertCurrency(
      parseFloat(row.total_revenue),
      row.currency_id,
      displayCurrencyId,
      exchangeRates,
    );
    const saleCount = parseInt(row.sale_count, 10);

    const existing = map.get(row.promotion_id);
    if (existing) {
      existing.total_discount += discount;
      existing.total_revenue += revenue;
      existing.sale_count += saleCount;
    } else {
      map.set(row.promotion_id, {
        promotion_id: row.promotion_id,
        promotion_name: row.promotion_name,
        promotion_code: row.promotion_code,
        is_active: row.is_active,
        promotion_type: row.promotion_type,
        sale_count: saleCount,
        total_discount: discount,
        total_revenue: revenue,
      });
    }
  }

  return Array.from(map.values());
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  align = "right",
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  align?: "left" | "right";
}) {
  const isActive = sortField === field;
  return (
    <th
      className={[
        "px-4 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap",
        "hover:text-gray-900 transition-colors",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
      onClick={() => onSort(field)}
    >
      {label}
      <span className="ml-1 text-gray-400">
        {isActive ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </th>
  );
}

export function PromotionsAnalyticsPage() {
  const { rows: initialRows, currencies, exchangeRates, branches, tenantId } =
    useLoaderData() as PromotionsAnalyticsLoaderData;

  const [rows, setRows] = useState<PromoAnalyticsRow[]>(initialRows);
  const [currentInterval, setCurrentInterval] = useState<PromoInterval>(
    DEFAULT_PROMO_INTERVAL,
  );
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedCurrencyId, setSelectedCurrencyId] = useState(CRC_CURRENCY_ID);
  const [sortField, setSortField] = useState<SortField>("total_discount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(false);

  const currency =
    currencies.find((c) => Number(c.currency_id) === selectedCurrencyId) ??
    currencies[0];

  const fmt = (value: number) =>
    formatMoney(
      value,
      currency?.currency_code ?? "CRC",
      currency?.symbol ?? "₡",
    );

  async function refetch(
    nextInterval: PromoInterval,
    nextActive: ActiveFilter,
    nextBranch: string,
  ) {
    setLoading(true);
    try {
      const isActiveParam =
        nextActive === "all" ? undefined : nextActive === "true";
      const branchParam = nextBranch === "all" ? undefined : nextBranch;
      const data = await promotionApi.getAnalytics(
        tenantId,
        nextInterval,
        isActiveParam,
        branchParam,
      );
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  function handleIntervalChange(value: string) {
    const next = value as PromoInterval;
    setCurrentInterval(next);
    void refetch(next, activeFilter, branchFilter);
  }

  function handleActiveFilterChange(value: string) {
    const next = value as ActiveFilter;
    setActiveFilter(next);
    void refetch(currentInterval, next, branchFilter);
  }

  function handleBranchChange(value: string) {
    setBranchFilter(value);
    void refetch(currentInterval, activeFilter, value);
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const availableTypes = useMemo(() => {
    const types = new Set(rows.map((r) => r.promotion_type));
    return Array.from(types).sort();
  }, [rows]);

  const summaries = useMemo(() => {
    const aggregated = aggregateRows(rows, selectedCurrencyId, exchangeRates);

    const filtered =
      typeFilter === "all"
        ? aggregated
        : aggregated.filter((s) => s.promotion_type === typeFilter);

    return [...filtered].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return mul * (a[sortField] - b[sortField]);
    });
  }, [rows, selectedCurrencyId, exchangeRates, typeFilter, sortField, sortDir]);

  const totalDiscount = summaries.reduce((acc, s) => acc + s.total_discount, 0);
  const totalSales = summaries.reduce((acc, s) => acc + s.sale_count, 0);
  const withUsage = summaries.filter((s) => s.sale_count > 0).length;

  const branchOptions = [
    { value: "all", label: "Todas las sucursales" },
    ...branches.map((b) => ({ value: b.branch_id, label: b.branch_name })),
  ];

  const typeOptions = [
    { value: "all", label: "Todos los tipos" },
    ...availableTypes.map((t) => ({ value: t, label: t })),
  ];

  return (
    <div className="p-6 lg:p-8">
      <section className="mb-6 rounded-4xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-700">
              Finanzas
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Promociones
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Impacto de descuentos por promocion, ventas generadas y efecto en
              la rentabilidad del periodo seleccionado.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div className="w-56">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Intervalo</p>
          <Select
            value={currentInterval}
            onChange={(e) => handleIntervalChange(e.target.value)}
            options={PROMO_INTERVAL_OPTIONS}
          />
        </div>
        <div className="w-44">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Estado</p>
          <Select
            value={activeFilter}
            onChange={(e) => handleActiveFilterChange(e.target.value)}
            options={[
              { value: "all", label: "Todas" },
              { value: "true", label: "Activas" },
              { value: "false", label: "Inactivas" },
            ]}
          />
        </div>
        {branches.length > 1 && (
          <div className="w-56">
            <p className="mb-1.5 text-sm font-medium text-gray-700">
              Sucursal
            </p>
            <Select
              value={branchFilter}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={branchOptions}
            />
          </div>
        )}
        {currencies.length > 1 && (
          <div className="w-56">
            <p className="mb-1.5 text-sm font-medium text-gray-700">
              Mostrar en
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
          <div className="flex items-center gap-2 pb-1 text-sm text-gray-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-200 border-t-accent-500" />
            Actualizando...
          </div>
        )}
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total en descuentos"
          value={fmt(totalDiscount)}
          icon={<IconCreditCard />}
          sublabel="Monto dejado de ingresar en el periodo"
          accent
        />
        <StatCard
          label="Ventas con promocion"
          value={totalSales.toLocaleString("es-CR")}
          icon={<IconTrendingUp />}
          sublabel="Transacciones que aplicaron una promocion"
        />
        <StatCard
          label="Promociones con uso"
          value={withUsage.toLocaleString("es-CR")}
          icon={<IconCheckCircle />}
          sublabel="Con al menos una venta en el periodo"
        />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Detalle por promocion
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Haz clic en los encabezados para ordenar
            </p>
          </div>
          {availableTypes.length > 1 && (
            <div className="w-52">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={typeOptions}
              />
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-medium text-gray-600">
                  Promocion
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                <SortHeader
                  field="sale_count"
                  label="Ventas"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  field="total_revenue"
                  label="Ingresos"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  field="total_discount"
                  label="Descuento"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-gray-400"
                  >
                    Sin datos para el periodo seleccionado
                  </td>
                </tr>
              ) : (
                summaries.map((row) => (
                  <tr
                    key={row.promotion_id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">
                        {row.promotion_name}
                      </p>
                      {row.promotion_code && (
                        <p className="text-xs text-gray-400">
                          {row.promotion_code}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.promotion_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          row.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500",
                        ].join(" ")}
                      >
                        {row.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {row.sale_count.toLocaleString("es-CR")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmt(row.total_revenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {fmt(row.total_discount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
