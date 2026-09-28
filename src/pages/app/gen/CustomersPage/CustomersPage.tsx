import { useEffect, useRef, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTableQuery } from "@/hooks/useTableQuery";

import {
  getAllCustomers,
  getCustomersByTenant,
  searchCustomers,
  type CustomersPageLoaderData,
} from "@/router/loaders/customer.loaders";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/router/actions/customer.actions";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/assets/icons";

import { identificationTypes } from "@/constants/identification-types";
import { defaultCustomerSegments } from "@/constants/default-customer-segments";

import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { CreateCustomerRequest } from "@/interfaces/api/requests/CreateCustomerRequest.interface";
import type { UpdateCustomerRequest } from "@/interfaces/api/requests/UpdateCustomerRequest.interface";
import type { CustomersListResponse } from "@/interfaces/api/responses/CustomersListResponse.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { CustomerDetailModal } from "./CustomerDetailModal";
import { CustomerUpsertModal } from "./CustomerUpsertModal";
import { QuickSegmentChangeModal } from "./QuickSegmentChangeModal";

type CustomerWithTenant = Customer & { tenant_name?: string };

interface UpsertModalState {
  open: boolean;
  mode: "create" | "edit";
  customer?: Customer;
}

export function CustomersPage() {
  const { data } = useLoaderData() as {
    data: Promise<CustomersPageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {({ initialCustomers, segments, tenants }) => (
        <CustomersPageContent
          initialCustomers={initialCustomers}
          segments={segments}
          tenants={tenants}
        />
      )}
    </DeferredPage>
  );
}

function CustomersPageContent({
  initialCustomers,
  tenants,
}: CustomersPageLoaderData) {
  const { user: currentUser } = useAuth();

  const isSuperAdmin = currentUser?.role.role_id === 1;
  const canManage = isSuperAdmin || currentUser?.role.role_id === 2;

  // List state — initialized from loader
  const [customers, setCustomers] = useState<Customer[]>(
    initialCustomers.customers,
  );
  const [total, setTotal] = useState(initialCustomers.total);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialCustomers.total / initialCustomers.limit),
  );
  const [isLoading, setIsLoading] = useState(false);

  // Filters & pagination
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const { page, limit, setPage, handleLimitChange } = useTableQuery({
    initialPage: initialCustomers.page,
    initialLimit: initialCustomers.limit,
  });

  // Toast
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  // Modals
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [isQuickSegmentOpen, setIsQuickSegmentOpen] = useState(false);
  const [upsertModal, setUpsertModal] = useState<UpsertModalState>({
    open: false,
    mode: "create",
  });

  // Re-fetch on search/filter/page changes (skip initial render — data from loader)
  const isFirstRender = useRef(true);

  // Reset to first page when query or segment changes
  useEffect(() => {
    if (isFirstRender.current) return;
    setPage(1);
  }, [query, segment]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const delay = query.trim() ? 300 : 0;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const tenantId = currentUser?.tenant.tenant_id ?? "";
        let result: CustomersListResponse;

        if (isSuperAdmin) {
          result = await getAllCustomers(page, limit);
        } else if (query.trim()) {
          result = await searchCustomers(tenantId, query, page, limit, segment);
        } else {
          result = await getCustomersByTenant(tenantId, page, limit, segment);
        }

        setCustomers(result.customers);
        setTotal(result.total);
        setTotalPages(Math.ceil(result.total / result.limit));
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, segment, page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Optimistic handlers ────────────────────────────────────────────────────

  const handleCreate = (data: CreateCustomerRequest) => {
    const tempId = `temp-${Date.now()}`;
    const tempCustomer: Customer = {
      customer_id: tempId,
      tenant_id: data.tenant_id,
      first_name: data.first_name,
      last_name: data.last_name,
      identification_type: data.document_type_id,
      document_number: data.document_number,
      birthdate: data.birthdate,
      econ_activity: data.economic_activity,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postal_code: data.postal_code,
      segment_id: data.segment_id ?? undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCustomers((prev) => [tempCustomer, ...prev]);
    setTotal((prev) => prev + 1);

    void createCustomer(data)
      .then((result) => {
        setCustomers((prev) =>
          prev.map((c) => (c.customer_id === tempId ? result : c)),
        );
        setToast({ mode: "success", message: "Cliente creado exitosamente" });
      })
      .catch((err: unknown) => {
        setCustomers((prev) => prev.filter((c) => c.customer_id !== tempId));
        setTotal((prev) => prev - 1);
        setToast({
          mode: "error",
          message:
            err instanceof Error ? err.message : "Error al crear cliente",
        });
      });
  };

  const handleUpdate = (customerId: string, data: UpdateCustomerRequest) => {
    const original = customers.find((c) => c.customer_id === customerId);

    setCustomers((prev) =>
      prev.map((c) => (c.customer_id === customerId ? { ...c, ...data, segment_id: data.segment_id ?? undefined } : c)),
    );

    void updateCustomer(customerId, data)
      .then((result) => {
        setCustomers((prev) =>
          prev.map((c) => (c.customer_id === customerId ? result : c)),
        );
        setToast({
          mode: "success",
          message: "Cliente actualizado exitosamente",
        });
      })
      .catch((err: unknown) => {
        if (original) {
          setCustomers((prev) =>
            prev.map((c) => (c.customer_id === customerId ? original : c)),
          );
        }
        setToast({
          mode: "error",
          message:
            err instanceof Error ? err.message : "Error al actualizar cliente",
        });
      });
  };

  const handleDelete = (customerId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este cliente?")) return;

    const toDelete = customers.find((c) => c.customer_id === customerId);
    setCustomers((prev) => prev.filter((c) => c.customer_id !== customerId));
    setTotal((prev) => prev - 1);

    void deleteCustomer(customerId)
      .then(() => {
        setToast({
          mode: "success",
          message: "Cliente eliminado exitosamente",
        });
      })
      .catch((err: unknown) => {
        if (toDelete) setCustomers((prev) => [...prev, toDelete]);
        setTotal((prev) => prev + 1);
        setToast({
          mode: "error",
          message:
            err instanceof Error ? err.message : "Error al eliminar cliente",
        });
      });
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getDocTypeLabel = (value: number) =>
    identificationTypes.find((d) => d.value === value)?.label ?? String(value);

  const getDocTypeLetter = (value: number) => {
    const match = getDocTypeLabel(value).match(/\(([^)]+)\)/);
    return match ? match[1] : String(value);
  };

  const getSegmentName = (segmentId?: number) =>
    defaultCustomerSegments.find((s) => s.value === segmentId)?.label ?? "—";

  const columns: Column[] = [
    { key: "document_number", label: "Documento", width: "14%" },
    {
      key: "identification_type",
      label: "Tipo de documento",
      width: "10%",
      render: (type) => getDocTypeLetter(type),
    },
    {
      key: "first_name",
      label: "Nombre Completo",
      width: "20%",
      render: (_, row) => `${row.first_name} ${row.last_name}`,
    },
    {
      key: "email",
      label: "Email",
      width: "18%",
      render: (email) => email || "—",
    },
    {
      key: "phone",
      label: "Teléfono",
      width: "12%",
      render: (phone) => phone || "—",
    },
    {
      key: "segment_id",
      label: "Segmento",
      width: "12%",
      render: (segmentId) =>
        segmentId ? (
          <Badge variant="secondary">{getSegmentName(segmentId)}</Badge>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "tenant_name",
            label: "Tenant",
            width: "10%",
            render: (_: unknown, row: CustomerWithTenant) =>
              row.tenant_name || "—",
          },
        ]
      : []),
    ...(canManage
      ? [
          {
            key: "actions",
            label: "Acciones",
            width: "8%",
            render: (_: unknown, row: Customer) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  onClick={() => setDetailCustomer(row)}
                  title="Ver detalles"
                  variant="ghost"
                  className="hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <IconEye />
                </Button>
                <Button
                  onClick={() =>
                    setUpsertModal({ open: true, mode: "edit", customer: row })
                  }
                  title="Editar cliente"
                  variant="ghost"
                  className="hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <IconEdit />
                </Button>
                <Button
                  onClick={() => handleDelete(row.customer_id)}
                  title="Eliminar cliente"
                  variant="danger"
                  className="hover:bg-red-50 rounded-lg transition-colors"
                >
                  <IconTrash />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeaderBanner
        eyebrow="General"
        title="Gestión de Clientes"
        description={
          isSuperAdmin
            ? "Clientes de todos los tenants"
            : `Directorio de clientes de ${currentUser?.tenant.tenant_name}`
        }
      />

      {/* Search & Actions */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-3">
          <div className="flex-1 min-w-0">
            <Input
              label="Buscar cliente"
              placeholder="Número de documento"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="w-full lg:max-w-sm"
              required
            />
          </div>
          {!isSuperAdmin && (
            <div className="flex-1 min-w-0">
              <Select
                label="Segmento"
                value={segment}
                onChange={(e) => {
                  setSegment(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Todos los segmentos" },
                  ...defaultCustomerSegments,
                ]}
                className="w-full lg:max-w-sm"
              />
            </div>
          )}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-gray-500">
              {total} cliente{total !== 1 ? "s" : ""}
            </span>
            {canManage && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsQuickSegmentOpen(true)}
                  className="w-full lg:w-auto"
                  title="Buscar un cliente y cambiar rápidamente su segmento"
                >
                  Cambiar segmento
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setUpsertModal({ open: true, mode: "create" })}
                  className="w-full lg:w-auto"
                >
                  <IconPlus />
                  Nuevo Cliente
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          columns={columns}
          data={customers}
          isLoading={isLoading}
          emptyMessage="No hay clientes registrados"
          // onRowClick={(row) => setDetailCustomer(row)}
        />
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={isLoading}
            limit={limit}
            onLimitChange={handleLimitChange}
            total={total}
          />
        )}
      </div>

      {detailCustomer && (
        <CustomerDetailModal
          customer={detailCustomer}
          onClose={() => setDetailCustomer(null)}
        />
      )}

      <CustomerUpsertModal
        key={`${upsertModal.mode}-${upsertModal.customer?.customer_id ?? "new"}`}
        mode={upsertModal.mode}
        isOpen={upsertModal.open}
        customer={upsertModal.customer}
        currentTenantId={currentUser?.tenant.tenant_id ?? ""}
        tenants={tenants}
        isSuperAdmin={isSuperAdmin}
        defaultSegmentId={4}
        onClose={() => setUpsertModal((prev) => ({ ...prev, open: false }))}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <QuickSegmentChangeModal
        isOpen={isQuickSegmentOpen}
        tenantId={currentUser?.tenant.tenant_id ?? ""}
        onClose={() => setIsQuickSegmentOpen(false)}
        onSuccess={() => {
          setQuery("");
          setSegment("");
          setPage(1);
        }}
      />
    </div>
  );
}
