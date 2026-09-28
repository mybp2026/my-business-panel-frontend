import { tenantApi } from "@/api";
import { IconBuilding } from "@/assets/icons/IconBuilding";
import { IconCheckCircle } from "@/assets/icons/IconCheckCircle";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Pagination } from "@/components/ui/Table";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { useTableQuery } from "@/hooks/useTableQuery";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { Tenant } from "@/interfaces/entities/Tenant.interface";
import { useEffect, useState } from "react";

const columns: Column[] = [
  {
    key: "tenant_name",
    label: "Empresa",
    render: (_: unknown, row: Tenant) => (
      <div>
        <p className="font-medium text-gray-900">{row.tenant_name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{row.sign}</p>
      </div>
    ),
  },
  { key: "contact_email", label: "Email" },
  { key: "identification", label: "Identificación" },
  {
    key: "is_subscribed",
    label: "Suscripción",
    render: (v: boolean) => <SubscriptionBadge active={v} />,
  },
];

export function SuperuserDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { page, limit, setPage, handleLimitChange } = useTableQuery();

  useEffect(() => {
    tenantApi
      .getAll()
      .then((res) =>
        setTenants(Array.isArray(res) ? res : (res?.tenants ?? [])),
      )
      .catch(() => setError("No se pudieron cargar los tenants."))
      .finally(() => setLoading(false));
  }, []);

  const subscribedCount = tenants.filter((t) => t.is_subscribed).length,
    totalPages = Math.max(1, Math.ceil(tenants.length / limit)),
    startIdx = (page - 1) * limit,
    endIdx = startIdx + limit,
    paginatedTenants = tenants.slice(startIdx, endIdx);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeaderBanner
        eyebrow="General"
        title="Panel de Control"
        description="Vista de superusuario — todos los tenants"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Tenants registrados"
          value={loading ? "—" : tenants.length}
          icon={<IconBuilding />}
          sublabel="Total en la plataforma"
          accent
        />
        <StatCard
          label="Suscripciones activas"
          value={loading ? "—" : subscribedCount}
          icon={<IconCheckCircle />}
          sublabel={`${loading ? "—" : tenants.length - subscribedCount} sin suscripción`}
        />
      </div>

      {/* Tenant list */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3 font-display">
          Tenants
        </h2>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && tenants.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            No hay tenants registrados aún.
          </div>
        )}

        {!loading && !error && tenants.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <Table columns={columns} data={paginatedTenants} />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={loading}
              limit={limit}
              onLimitChange={handleLimitChange}
              total={tenants.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}
