import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, Pagination } from "@/components/ui/Table";

import { useTableQuery } from "@/hooks/useTableQuery";

import { identificationTypes } from "@/constants/identification-types";

import { customerApi } from "@/api/customer.api";
import type { Customer } from "@/interfaces/entities/Customer.interface";
import type {
  CustomerDetail,
  CustomerSaleHistoryItem,
} from "@/interfaces/entities/CustomerDetail.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";

const SALES_HISTORY_LIMIT = 8;

type Tab = "info" | "loyalty" | "sales";

const SEGMENT_COLORS: Record<string, "accent" | "blue" | "green" | "gray" | "red"> = {
  vip: "accent",
  loyal: "blue",
  regular: "green",
  new: "gray",
  inactive: "red",
};

function field(label: string, value?: string | number | null) {
  return (
    <div key={label}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

export function CustomerDetailModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [sales, setSales] = useState<CustomerSaleHistoryItem[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [loadingSales, setLoadingSales] = useState(false);
  const {
    page: salesPage,
    limit: salesLimit,
    setPage: setSalesPage,
    handleLimitChange: handleSalesLimitChange,
  } = useTableQuery({ initialLimit: SALES_HISTORY_LIMIT });
  const salesPages = Math.max(1, Math.ceil(salesTotal / salesLimit));

  const docTypeLabel =
    identificationTypes.find((t) => t.value === customer.identification_type)?.label ??
    String(customer.identification_type);

  // Load enriched detail on first open
  useEffect(() => {
    setLoadingDetail(true);
    customerApi
      .getDetail(customer.customer_id)
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [customer.customer_id]);

  // Load sales history when tab is opened or page changes
  useEffect(() => {
    if (activeTab !== "sales") return;
    setLoadingSales(true);
    customerApi
      .getSalesHistory(customer.customer_id, salesPage, salesLimit)
      .then((res) => {
        setSales(res.sales);
        setSalesTotal(res.total);
      })
      .catch(() => setSales([]))
      .finally(() => setLoadingSales(false));
  }, [activeTab, salesPage, salesLimit, customer.customer_id]);

  const segmentColorKey = (detail?.segment_name ?? "").toLowerCase();
  const segmentVariant = SEGMENT_COLORS[segmentColorKey] ?? "gray";

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Información" },
    { key: "loyalty", label: "Lealtad" },
    { key: "sales", label: `Ventas (${salesTotal})` },
  ];

  const salesColumns: Column[] = [
    {
      key: "sale_date",
      label: "Fecha",
      width: "16%",
      render: (value) => new Date(value as string).toLocaleDateString("es-CR"),
    },
    {
      key: "branch_name",
      label: "Sucursal",
      width: "20%",
      render: (value) => (value as string) ?? "—",
    },
    {
      key: "total_amount",
      label: "Total",
      width: "18%",
      align: "right",
      render: (_, row: CustomerSaleHistoryItem) =>
        `${row.currency_symbol}${Number(row.total_amount).toLocaleString("es-VE", {
          minimumFractionDigits: 2,
        })}`,
    },
    { key: "currency_code", label: "Moneda", width: "12%" },
    {
      key: "invoice_id",
      label: "Factura",
      width: "12%",
      render: (value) => (value ? "Sí" : "—"),
    },
    {
      key: "status",
      label: "Estado",
      width: "22%",
      render: (_, row: CustomerSaleHistoryItem) =>
        row.return_transaction_id ? (
          <Badge variant="red">Reembolsada</Badge>
        ) : row.is_completed ? (
          <Badge variant="green">Completada</Badge>
        ) : (
          <Badge variant="yellow">Pendiente</Badge>
        ),
    },
  ];

  return (
    <Modal isOpen onClose={onClose} title="Detalle de Cliente" size="lg">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-5 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
              activeTab === t.key
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Información ──────────────────────────────────────── */}
      {activeTab === "info" && (
        <div className="space-y-5">
          <div>
            <SectionTitle>Identificación</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              {field("Nombre", `${customer.first_name} ${customer.last_name}`)}
              {field("Tipo Doc.", docTypeLabel)}
              {field("Documento", customer.document_number)}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                  Segmento
                </p>
                {loadingDetail ? (
                  <span className="text-xs text-gray-400">Cargando...</span>
                ) : detail?.segment_name ? (
                  <Badge variant={segmentVariant}>{detail.segment_name}</Badge>
                ) : (
                  <span className="text-sm text-gray-900">—</span>
                )}
              </div>
            </div>
          </div>

          {(customer.email || customer.phone) && (
            <div className="border-t border-gray-100 pt-4">
              <SectionTitle>Contacto</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                {field("Email", customer.email)}
                {field("Teléfono", customer.phone)}
              </div>
            </div>
          )}

          {customer.address && (
            <div className="border-t border-gray-100 pt-4">
              <SectionTitle>Dirección</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                {field("Dirección", customer.address)}
              </div>
            </div>
          )}

          {detail?.econ_activity && (
            <div className="border-t border-gray-100 pt-4">
              {field("Actividad económica", detail.econ_activity)}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {field("Creado", new Date(customer.created_at).toLocaleString("es-CR"))}
              {field("Actualizado", new Date(customer.updated_at).toLocaleString("es-CR"))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Lealtad ─────────────────────────────────────────── */}
      {activeTab === "loyalty" && (
        <div className="space-y-5">
          {loadingDetail ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
          ) : detail ? (
            <>
              {/* Current score */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {detail.loyalty_score.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Puntos disponibles</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {detail.loyalty_lifetime_score.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Puntos acumulados</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {detail.loyalty_score_redeemed.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Puntos canjeados</p>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t border-gray-100 pt-4">
                <SectionTitle>Historial de actividad</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  {field(
                    "Último puntaje ganado",
                    detail.last_earned_at
                      ? new Date(detail.last_earned_at).toLocaleString("es-CR")
                      : null,
                  )}
                  {field(
                    "Último canje",
                    detail.last_redeemed_at
                      ? new Date(detail.last_redeemed_at).toLocaleString("es-CR")
                      : null,
                  )}
                </div>
              </div>

              {/* Loyalty program config */}
              {detail.loyalty_program_id ? (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <SectionTitle>Programa de lealtad activo</SectionTitle>
                    {detail.loyalty_program_active ? (
                      <Badge variant="green">Activo</Badge>
                    ) : (
                      <Badge variant="red">Inactivo</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {field(
                      "Puntos por unidad de moneda",
                      detail.points_earned_per_currency_unit,
                    )}
                    {field(
                      "Unidades por punto al canjear",
                      detail.points_redeemed_per_currency_unit,
                    )}
                    {field(
                      "Compra mínima para ganar puntos",
                      detail.minimum_purchase_for_points != null
                        ? `Bs. ${Number(detail.minimum_purchase_for_points).toLocaleString()}`
                        : null,
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No hay programa de lealtad configurado para este tenant.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-8">
              No se pudo cargar la información de lealtad.
            </p>
          )}
        </div>
      )}

      {/* ── TAB: Ventas ──────────────────────────────────────────── */}
      {activeTab === "sales" && (
        <div className="space-y-3">
          <Table
            columns={salesColumns}
            data={sales}
            isLoading={loadingSales}
            emptyMessage="Este cliente no tiene ventas registradas."
          />
          {salesPages > 1 && (
            <Pagination
              page={salesPage}
              totalPages={salesPages}
              onPageChange={setSalesPage}
              loading={loadingSales}
              limit={salesLimit}
              onLimitChange={handleSalesLimitChange}
              total={salesTotal}
              limitOptions={[8, 25, 50, 100]}
            />
          )}
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 mt-4">
        <Button type="button" variant="ghost" fullWidth onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
