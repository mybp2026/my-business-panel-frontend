import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import {
  IconCreditCard,
  IconTrendingUp,
  IconCheckCircle,
} from "@/assets/icons";

import { promotionApi } from "@/api/promotion.api";
import { convertCurrency, formatMoney } from "@/utils/currency";
import { useDisplayCurrency } from "@/context/CurrencyContext";
import {
  DEFAULT_PROMO_INTERVAL,
  PROMO_INTERVAL_OPTIONS,
} from "@/constants/promotion";
import { RoyaltyAnalyticsTab } from "./RoyaltyAnalyticsTab";
import { LoyaltyAnalyticsTab } from "./LoyaltyAnalyticsTab";
import { DeferredPage } from "@/components/routing/DeferredPage";

import type { PromotionsAnalyticsLoaderData } from "@/router/loaders/promotionsAnalytics.loaders";
import type {
  PromoAnalyticsRow,
  PromoAnalyticsSummary,
  PromoInterval,
} from "@/interfaces/entities/Promotion.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";

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

export function PromotionsAnalyticsPage() {
  const { data } = useLoaderData() as {
    data: Promise<PromotionsAnalyticsLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {(resolved) => <PromotionsAnalyticsPageContent {...resolved} />}
    </DeferredPage>
  );
}

function PromotionsAnalyticsPageContent({
  rows: initialRows,
  royalty,
  loyalty,
  currencies,
  exchangeRates,
  branches,
  tenantId,
}: PromotionsAnalyticsLoaderData) {
  const [tab, setTab] = useState<"promociones" | "regalias" | "fidelidad">(
    "promociones",
  );
  const [rows, setRows] = useState<PromoAnalyticsRow[]>(initialRows);
  const [currentInterval, setCurrentInterval] = useState<PromoInterval>(
    DEFAULT_PROMO_INTERVAL,
  );
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  // Moneda visualizada: toggle universal del header (ver CurrencyContext).
  const { displayCurrencyId: selectedCurrencyId } = useDisplayCurrency();
  const [sortField, setSortField] = useState<SortField>("total_discount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(false);

  const currency =
    currencies.find((c) => Number(c.currency_id) === selectedCurrencyId) ??
    currencies[0];

  const fmt = (value: number) =>
    formatMoney(
      value,
      currency?.currency_code ?? "VES",
      currency?.symbol ?? "Bs.",
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

  const summaryColumns: Column[] = [
    {
      key: "promotion_name",
      label: "Promocion",
      width: "26%",
      render: (_value, row: PromoAnalyticsSummary) => (
        <>
          <p className="font-medium text-gray-900">{row.promotion_name}</p>
          {row.promotion_code && (
            <p className="text-xs text-gray-400">{row.promotion_code}</p>
          )}
        </>
      ),
    },
    {
      key: "promotion_type",
      label: "Tipo",
      width: "16%",
      render: (value) => (
        <span className="text-gray-600">{value as string}</span>
      ),
    },
    {
      key: "is_active",
      label: "Estado",
      width: "14%",
      render: (value) => (
        <span
          className={[
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {value ? "Activa" : "Inactiva"}
        </span>
      ),
    },
    {
      key: "sale_count",
      label: "Ventas",
      width: "14%",
      align: "right",
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {(value as number).toLocaleString("es-CR")}
        </span>
      ),
    },
    {
      key: "total_revenue",
      label: "Ingresos",
      width: "15%",
      align: "right",
      sortable: true,
      render: (value) => (
        <span className="text-gray-700">{fmt(value as number)}</span>
      ),
    },
    {
      key: "total_discount",
      label: "Descuento",
      width: "15%",
      align: "right",
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-red-600">
          {fmt(value as number)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <PageHeaderBanner
        eyebrow="Finanzas"
        title="Promociones"
        description="Impacto de descuentos por promocion y valor de la mercancia entregada como regalia en el periodo seleccionado."
      />

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: "promociones", label: "Promociones" },
            { id: "regalias", label: "Regalias" },
            { id: "fidelidad", label: "Punto de fidelidad" },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as typeof tab)}
        />
      </div>

      {tab === "regalias" && (
        <RoyaltyAnalyticsTab
          initial={royalty}
          branches={branches}
          tenantId={tenantId}
        />
      )}

      {tab === "fidelidad" && (
        <LoyaltyAnalyticsTab initial={loyalty} branches={branches} />
      )}

      {tab === "promociones" && (
        <>
          <section className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <div className="w-56">
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                Intervalo
              </p>
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
            <Table
              columns={summaryColumns}
              data={summaries}
              emptyMessage="Sin datos para el periodo seleccionado"
              sortBy={sortField}
              sortDir={sortDir}
              onSortChange={(key) => handleSort(key as SortField)}
            />
          </section>
        </>
      )}
    </div>
  );
}
