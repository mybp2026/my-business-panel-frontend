import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { IconTrendingUp, IconCreditCard } from "@/assets/icons";

import { royaltyApi } from "@/api/royalty.api";
import { formatMoney } from "@/utils/currency";
import {
  DEFAULT_PROMO_INTERVAL,
  PROMO_INTERVAL_OPTIONS,
} from "@/constants/promotion";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type {
  RoyaltyAnalytics,
  RoyaltyBucketUnit,
  RoyaltyInterval,
} from "@/interfaces/entities/RoyaltyAnalytics.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";

const CATEGORY_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
];

const fmtMoney = (value: number) => formatMoney(value, "CRC", "₡");
const fmtUnits = (value: number) =>
  `${Number(value ?? 0).toLocaleString("es-CR")} u`;

function formatBucketLabel(iso: string, unit: RoyaltyBucketUnit): string {
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

interface RoyaltyAnalyticsTabProps {
  initial: RoyaltyAnalytics | null;
  branches: Branch[];
  tenantId: string;
}

export function RoyaltyAnalyticsTab({
  initial,
  branches,
  tenantId,
}: RoyaltyAnalyticsTabProps) {
  const [data, setData] = useState<RoyaltyAnalytics | null>(initial);
  const [interval, setInterval] = useState<RoyaltyInterval>(
    initial?.interval ?? DEFAULT_PROMO_INTERVAL,
  );
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intervalo + sucursal re-consultan al backend (regla del repo).
  async function refetch(nextInterval: RoyaltyInterval, nextBranchId: string) {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      setData(
        await royaltyApi.getAnalytics(
          tenantId,
          nextInterval,
          nextBranchId || null,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar regalias");
    } finally {
      setLoading(false);
    }
  }

  function handleIntervalChange(value: string) {
    const next = value as RoyaltyInterval;
    setInterval(next);
    void refetch(next, branchId);
  }

  function handleBranchChange(value: string) {
    setBranchId(value);
    void refetch(interval, value);
  }

  const totals = data?.totals;
  const categories = data?.by_category ?? [];
  const customers = data?.by_customer ?? [];
  const evolution = (data?.evolution ?? []).map((p) => ({
    label: formatBucketLabel(p.bucket_start, data?.bucket_unit ?? "day"),
    value: p.value,
  }));

  const categoryData = categories.map((c) => ({
    name: c.category_name,
    value: c.value,
  }));

  const customerColumns: Column[] = [
    {
      key: "name",
      label: "Cliente",
      width: "34%",
      render: (value: unknown) => (
        <span className="font-medium text-gray-800">{value as string}</span>
      ),
    },
    {
      key: "document_number",
      label: "Documento",
      width: "20%",
      render: (value: unknown) => (value as string) || "—",
    },
    {
      key: "quantity",
      label: "Unidades",
      width: "20%",
      render: (value: unknown) => fmtUnits(Number(value)),
    },
    {
      key: "value",
      label: "Valor regalado",
      width: "26%",
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-red-700">
          {fmtMoney(Number(value))}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div className="w-56">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Intervalo</p>
          <Select
            value={interval}
            onChange={(e) => handleIntervalChange(e.target.value)}
            options={PROMO_INTERVAL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </div>
        {branches.length > 1 && (
          <div className="w-56">
            <p className="mb-1.5 text-sm font-medium text-gray-700">Sucursal</p>
            <Select
              value={branchId}
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
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-200 border-t-accent-500" />
            Actualizando...
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total en regalias"
          value={fmtMoney(totals?.total_value ?? 0)}
          icon={<IconCreditCard />}
          sublabel="Mercancia entregada sin cobro"
          accent
        />
        <StatCard
          label="% respecto a ventas"
          value={`${(totals?.pct_of_sales ?? 0).toFixed(2)} %`}
          icon={<IconTrendingUp />}
          sublabel="Regalias sobre ventas del periodo"
        />
        <StatCard
          label="Lineas regaladas"
          value={String(totals?.gift_lines ?? 0)}
          icon={<IconTrendingUp />}
          sublabel="Movimientos registrados como regalia"
        />
      </div>

      {/* Top categorias */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-base font-semibold text-gray-900">
          Categorias mas regaladas
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Valor monetario obsequiado por categoria de producto.
        </p>
        {categoryData.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">
            Sin regalias en el periodo seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 4, left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v: number) => fmtMoney(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip
                formatter={(v) => [fmtMoney(Number(v)), "Valor regalado"]}
                labelStyle={{ color: "#374151" }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {categoryData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Evolucion */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-base font-semibold text-gray-900">
          Evolucion de mercancia obsequiada
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Valor regalado a lo largo del periodo seleccionado.
        </p>
        {evolution.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">
            Sin regalias en el periodo seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={evolution}
              margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v: number) => fmtMoney(v)}
              />
              <Tooltip
                formatter={(v) => [fmtMoney(Number(v)), "Regalado"]}
                labelStyle={{ color: "#374151" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Regalado"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top clientes */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-base font-semibold text-gray-900">
          Clientes con mas regalias
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Clientes que han recibido mayor valor en obsequios.
        </p>
        <Table
          columns={customerColumns}
          data={customers}
          emptyMessage="Sin regalias en el periodo seleccionado"
        />
      </div>
    </div>
  );
}
