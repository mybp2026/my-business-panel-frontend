import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { tenantApi } from "../../../api/tenant.api";
import { Input } from "../../../components/ui/Input";
import { Table, Pagination } from "../../../components/ui/Table";
import { Badge } from "../../../components/ui/Badge";
import { PageHeaderBanner } from "../../../components/layout/PageHeaderBanner";
import { useTableQuery } from "../../../hooks/useTableQuery";
import type { Tenant } from "../../../interfaces/entities/Tenant.interface";

export function TenantsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { page, limit, setPage, handleLimitChange } = useTableQuery();
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Verify user is admin nivel 1
  if (!user || user.role.role_hierarchy !== 1) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-red-900 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-red-700">
            Solo los administradores nivel 1 pueden acceder a la gestión de
            tenants.
          </p>
        </div>
      </div>
    );
  }

  // Load tenants
  const loadTenants = async (pageNum = 1, query = "", limitNum = limit) => {
    setIsLoading(true);
    try {
      let result;

      if (query.trim()) {
        result = await tenantApi.search(query, pageNum, limitNum);
      } else {
        result = await tenantApi.getAll(pageNum, limitNum);
      }

      const tenantList = Array.isArray(result) ? result : (result?.tenants ?? []);
      const total = Array.isArray(result) ? result.length : (result?.total ?? tenantList.length);
      const resultLimit = Array.isArray(result) ? tenantList.length : (result?.limit ?? limitNum);
      const newPage = Array.isArray(result) ? pageNum : (result?.page ?? pageNum);
      setTenants(tenantList);
      setTotal(total);
      setTotalPages(Math.max(1, Math.ceil(total / resultLimit)));
      setPage(newPage);
    } catch (error) {
      console.error("Error loading tenants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTenants(1, "", limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadTenants(1, searchQuery, limit);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, limit]);

  // Delete tenant
  const handleDeleteTenant = async (tenantId: string) => {
    if (
      !confirm(
        "¿Está seguro de que desea eliminar este tenant? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }

    try {
      await tenantApi.delete(tenantId);
      await loadTenants(page, searchQuery, limit);
    } catch (error) {
      console.error("Error deleting tenant:", error);
      alert(
        error instanceof Error ? error.message : "Error al eliminar tenant",
      );
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeaderBanner
        eyebrow="General"
        title="Gestión de Tenants"
        description="Visualiza y gestiona todos los tenants de la plataforma"
      />

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <Input
              placeholder="Buscar por nombre de tenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{total}</p>
            <p className="text-sm text-gray-600">Tenants Totales</p>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <Table
          columns={[
            { key: "tenant_name", label: "Nombre", width: "25%" },
            {
              key: "identification",
              label: "Identificación",
              width: "18%",
            },
            {
              key: "is_subscribed",
              label: "Suscripción",
              width: "15%",
              render: (isSubscribed) => (
                <Badge variant={isSubscribed ? "success" : "secondary"}>
                  {isSubscribed ? "Activa" : "Inactiva"}
                </Badge>
              ),
            },
            {
              key: "contact_email",
              label: "Email de Contacto",
              width: "20%",
            },
            {
              key: "created_at",
              label: "Creado",
              width: "12%",
              render: (date) => new Date(date).toLocaleDateString(),
            },
            {
              key: "actions",
              label: "Acciones",
              width: "10%",
              render: (_, row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/app/tenants/${row.tenant_id}`)}
                    className="px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handleDeleteTenant(row.tenant_id)}
                    className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ),
            },
          ]}
          data={tenants}
          isLoading={isLoading}
          emptyMessage="No hay tenants para mostrar"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(newPage) => {
              setPage(newPage);
              loadTenants(newPage, searchQuery, limit);
            }}
            loading={isLoading}
            limit={limit}
            onLimitChange={handleLimitChange}
            total={total}
          />
        )}
      </div>
    </div>
  );
}
