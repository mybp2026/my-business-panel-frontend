import { useState } from "react";
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
import { Table } from "@/components/ui/Table";
import {
  IconTrendingUp,
  IconCreditCard,
  IconCheckCircle,
  IconShoppingCart,
} from "@/assets/icons";

import { loyaltyFinanceApi } from "@/api/loyaltyFinance.api";
import { formatMoney } from "@/utils/currency";
import {
  DEFAULT_LOYALTY_INTERVAL,
  LOYALTY_INTERVAL_OPTIONS,
} from "@/constants/loyaltyFinance";

import type { LoyaltyFinancePageLoaderData } from "@/router/loaders/loyaltyFinance.loaders";
import type {
  BucketUnit,
  LoyaltyGrowthPoint,
  LoyaltyInterval,
  LoyaltyOverview,
} from "@/interfaces/entities/LoyaltyFinance.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";

const fmtMoney = (value: number) => formatMoney(value, "CRC", "₡");
const fmtPoints = (value: number) =>
  `${Number(value ?? 0).toLocaleString("es-CR")} pts`;

function formatBucketLabel(iso: string, unit: BucketUnit): string {
  const d = new Date(iso);
  switch (unit) {
    case "hour":
      return d.toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "month":
      return d.toLocaleDateString("es-CR", { month: "short", year: "2-digit" });
    default:
      return d.toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit" });
  }
}

function GrowthChart({
  points,
  unit,
}: {
  points: LoyaltyGrowthPoint[];
  unit: BucketUnit;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin movimientos de puntos en el periodo seleccionado
      </div>
    );
  }
  const data = points.map((p) => ({
    label: formatBucketLabel(p.bucket_start, unit),
    earned: p.earned,
    redeemed: p.redeemed,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <Tooltip
          formatter={(v, name) => [fmtPoints(Number(v)), String(name)]}
          labelStyle={{ color: "#374151" }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="earned"
          name="Puntos generados"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="redeemed"
          name="Puntos canjeados"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function LoyaltyFinancePage() {
  const { overview: initialOverview, branches, currentTenantName } =
    useLoaderData() as LoyaltyFinancePageLoaderData;

  const [overview, setOverview] = useState<LoyaltyOverview>(initialOverview);
  const [interval, setInterval] = useState<LoyaltyInterval>(
    initialOverview.interval ?? DEFAULT_LOYALTY_INTERVAL,
  );
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(false);

  // Intervalo + sucursal re-consultan al backend (regla del repo: filtros re-consultan).
  // El branchId solo afecta el grafico de crecimiento; los saldos son a nivel tenant.
  async function refetch(nextInterval: LoyaltyInterval, nextBranchId: string) {
    setLoading(true);
    try {
      setOverview(
        await loyaltyFinanceApi.getOverview(nextInterval, nextBranchId || null),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleIntervalChange(value: string) {
    const next = value as LoyaltyInterval;
    setInterval(next);
    void refetch(next, selectedBranchId);
  }

  function handleBranchChange(value: string) {
    setSelectedBranchId(value);
    void refetch(interval, value);
  }

  const { totals, config } = overview;

  const redeemRate = config
    ? Number(config.points_redeemed_per_currency_unit)
    : null;
  const earnPct = config
    ? Number(config.points_earned_per_currency_unit) * 100
    : null;

  const topColumns: Column[] = [
    {
      key: "name",
      label: "Cliente",
      width: "35%",
      render: (value: unknown) => (
        <span className="font-medium text-gray-800">
          {(value as string) || "Sin nombre"}
        </span>
      ),
    },
    {
      key: "document_number",
      label: "Documento",
      width: "20%",
      render: (value: unknown) => (value as string) || "—",
    },
    {
      key: "score",
      label: "Puntos activos",
      width: "22%",
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-accent-700">
          {fmtPoints(Number(value))}
        </span>
      ),
    },
    {
      key: "value",
      label: "Equivalencia",
      width: "23%",
      render: (value: unknown) => (
        <span className="font-mono text-gray-700">
          {fmtMoney(Number(value))}
        </span>
      ),
    },
  ];

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
              Puntos de fidelidad
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Valor monetario del programa de fidelizacion: los puntos activos
              representan una obligacion futura para la empresa.
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

      {/* Config + filtro de intervalo */}
      <section className="mb-6 flex flex-wrap items-center gap-6 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div className="w-64">
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            Intervalo (crecimiento)
          </p>
          <Select
            value={interval}
            onChange={(e) => void handleIntervalChange(e.target.value)}
            options={LOYALTY_INTERVAL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </div>
        <div className="text-sm text-gray-600">
          {config ? (
            <>
              <span className="font-medium text-gray-800">
                {earnPct !== null ? `${earnPct.toFixed(2)}%` : "—"}
              </span>{" "}
              de fidelidad por compra
              {redeemRate && redeemRate > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-gray-800">
                    {redeemRate.toLocaleString("es-CR")} pts
                  </span>{" "}
                  = ₡1
                </>
              )}
            </>
          ) : (
            <span className="text-amber-600">
              Sin programa de fidelidad activo — configura uno en Ajustes.
            </span>
          )}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-200 border-t-accent-500" />
            Actualizando...
          </div>
        )}
      </section>

      {/* Tarjetas resumen */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Puntos activos"
          value={fmtPoints(totals.active_points)}
          icon={<IconCreditCard />}
          sublabel="Saldo vigente, pendiente de uso"
        />
        <StatCard
          label="Equivalencia monetaria"
          value={fmtMoney(totals.active_value)}
          icon={<IconTrendingUp />}
          sublabel="Obligacion futura del programa"
          accent
        />
        <StatCard
          label="Puntos utilizados"
          value={fmtPoints(totals.redeemed_points)}
          icon={<IconCheckCircle />}
          sublabel={`${fmtMoney(totals.redeemed_value)} canjeados`}
        />
        <StatCard
          label="Puntos vencidos"
          value={fmtPoints(totals.expired_points)}
          icon={<IconCheckCircle />}
          sublabel="Sin politica de expiracion configurada"
        />
        <StatCard
          label="Puntos generados (historico)"
          value={fmtPoints(totals.lifetime_points)}
          icon={<IconTrendingUp />}
          sublabel={`${fmtMoney(totals.lifetime_value)} acumulados`}
        />
        <StatCard
          label="Clientes con puntos"
          value={String(totals.customers_with_points)}
          icon={<IconShoppingCart />}
          sublabel="Clientes con saldo activo"
        />
      </section>

      {/* Crecimiento del sistema de fidelidad */}
      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Crecimiento del sistema de fidelidad
            </h2>
            <p className="text-sm text-gray-500">
              Puntos generados frente a puntos canjeados en el periodo
              seleccionado.
            </p>
          </div>
          {branches.length > 1 && (
            <div className="w-60">
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                Sucursal
              </p>
              <Select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                options={[
                  { value: "", label: "Todas las sucursales" },
                  ...branches.map((b) => ({
                    value: b.branch_id,
                    label: b.branch_name,
                  })),
                ]}
              />
            </div>
          )}
        </div>
        <GrowthChart points={overview.growth} unit={overview.bucket_unit} />
      </section>

      {/* Clientes con mas puntos */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          Clientes con mas puntos acumulados
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Top de clientes por saldo de puntos activo.
        </p>
        <Table
          columns={topColumns}
          data={overview.top_customers}
          emptyMessage="Aun no hay clientes con puntos acumulados"
        />
      </section>
    </div>
  );
}
