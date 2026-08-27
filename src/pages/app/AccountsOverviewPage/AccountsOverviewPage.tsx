import { useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";

import {
  IconCreditCard,
  IconShoppingCart,
  IconTrendingUp,
  IconCheckCircle,
} from "@/assets/icons";

import { financesApi } from "@/api/finances.api";
import { getPayableStatusTone } from "@/utils/purchase";
import { getReceivableStatusTone } from "@/utils/accounts-receivable";

import type {
  AccountAlertStatus,
  AccountListParams,
  AccountPayableOverview,
  AccountReceivableOverview,
  AccountsAlertConfig,
  PayablePayment,
  ReceivableCollection,
} from "@/interfaces/entities/Finances.interface";
import type { AccountsOverviewPageLoaderData } from "@/router/loaders/finances.loaders";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

// ─── Constants ────────────────────────────────────────────────────────────────

const CRC_CURRENCY_ID = 1;

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "1", label: "Pendiente" },
  { value: "2", label: "Parcial" },
];

const SORT_BY_OPTIONS = [
  { value: "due_date", label: "Fecha limite" },
  { value: "created_at", label: "Fecha de emision" },
  { value: "balance_due", label: "Monto pendiente" },
];

const ALERT_LABEL: Record<AccountAlertStatus, string> = {
  vencida: "Vencida",
  urgente: "Urgente",
  advertencia: "Advertencia",
  al_dia: "Al dia",
};

const ALERT_VARIANT: Record<
  AccountAlertStatus,
  "red" | "accent" | "yellow" | "green"
> = {
  vencida: "red",
  urgente: "accent",
  advertencia: "yellow",
  al_dia: "green",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getExchangeRateToCrc(
  rates: ExchangeRate[],
  fromCurrencyId: number,
): number | null {
  if (fromCurrencyId === CRC_CURRENCY_ID) return 1;
  const direct = rates.find(
    (r) =>
      Number(r.from_currency_id) === fromCurrencyId &&
      Number(r.to_currency_id) === CRC_CURRENCY_ID,
  );
  if (direct) return Number(direct.rate);
  const rev = rates.find(
    (r) =>
      Number(r.from_currency_id) === CRC_CURRENCY_ID &&
      Number(r.to_currency_id) === fromCurrencyId,
  );
  if (rev && Number(rev.rate) > 0) return 1 / Number(rev.rate);
  return null;
}

function convertAmount(
  amountCrc: number,
  targetCurrencyId: number,
  rates: ExchangeRate[],
): number | null {
  if (targetCurrencyId === CRC_CURRENCY_ID) return amountCrc;
  const toTarget = rates.find(
    (r) =>
      Number(r.from_currency_id) === CRC_CURRENCY_ID &&
      Number(r.to_currency_id) === targetCurrencyId,
  );
  if (toTarget) return amountCrc * Number(toTarget.rate);
  const toCrc = getExchangeRateToCrc(rates, targetCurrencyId);
  if (toCrc && toCrc > 0) return amountCrc / toCrc;
  return null;
}

function formatAmount(
  value: number | string | null | undefined,
  targetCurrencyId: number,
  rates: ExchangeRate[],
  symbol: string,
): string {
  const num = Number(value ?? 0);
  if (targetCurrencyId === CRC_CURRENCY_ID) {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 2,
    }).format(num);
  }
  const converted = convertAmount(num, targetCurrencyId, rates);
  if (converted === null) return "—";
  return `${symbol} ${converted.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CR");
}

function computeAlertStatus(
  dueDate: string,
  alertConfig: AccountsAlertConfig | null,
): AccountAlertStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return "vencida";
  if (!alertConfig) return "al_dia";
  if (days <= alertConfig.urgent_days_before_due) return "urgente";
  if (days <= alertConfig.warning_days_before_due) return "advertencia";
  return "al_dia";
}

// ─── Custom hook ──────────────────────────────────────────────────────────────

function useTableFilter<T>(
  initialRows: T[],
  fetchFn: (params: AccountListParams) => Promise<T[]>,
  branchId: string,
) {
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function refetch(s: string, sb: string, sd: "asc" | "desc") {
    setLoading(true);
    try {
      setRows(
        await fetchFn({
          status: s || undefined,
          sort_by: sb,
          sort_dir: sd,
          branchId: branchId || undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  // El filtro de sucursal (page-level) re-consulta la lista. Se omite el primer
  // render porque el loader ya trajo las filas iniciales.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void refetch(status, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return {
    rows,
    loading,
    status,
    sortBy,
    sortDir,
    onStatusChange: (v: string) => {
      setStatus(v);
      void refetch(v, sortBy, sortDir);
    },
    onSortByChange: (v: string) => {
      setSortBy(v);
      void refetch(status, v, sortDir);
    },
    onSortDirToggle: () => {
      const next: "asc" | "desc" = sortDir === "desc" ? "asc" : "desc";
      setSortDir(next);
      void refetch(status, sortBy, next);
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
      {children}
    </p>
  );
}

function SortDirButton({
  dir,
  onClick,
}: {
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={dir === "desc" ? "Descendente" : "Ascendente"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      {dir === "desc" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      )}
    </button>
  );
}

function TableFilterBar({
  status,
  sortBy,
  sortDir,
  onStatusChange,
  onSortByChange,
  onSortDirToggle,
}: {
  status: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  onStatusChange: (v: string) => void;
  onSortByChange: (v: string) => void;
  onSortDirToggle: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="w-44">
        <Select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="w-44">
        <Select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          options={SORT_BY_OPTIONS}
        />
      </div>
      <SortDirButton dir={sortDir} onClick={onSortDirToggle} />
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-1.5 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-right text-sm text-gray-900">{value}</span>
    </div>
  );
}

function AlertStatusBadge({
  dueDate,
  alertConfig,
}: {
  dueDate: string;
  alertConfig: AccountsAlertConfig | null;
}) {
  const status = computeAlertStatus(dueDate, alertConfig);
  return <Badge variant={ALERT_VARIANT[status]}>{ALERT_LABEL[status]}</Badge>;
}

function ModalHistorySection({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-accent-200 border-t-accent-500" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AccountsOverviewPage() {
  const {
    overview: initialOverview,
    branches,
    currencies,
    exchangeRates,
    currentTenantName,
  } = useLoaderData() as AccountsOverviewPageLoaderData;

  const [overview, setOverview] = useState(initialOverview);
  const [branchId, setBranchId] = useState("");
  const [selectedCurrencyId, setSelectedCurrencyId] = useState(CRC_CURRENCY_ID);

  // Modal state
  const [selectedPayable, setSelectedPayable] =
    useState<AccountPayableOverview | null>(null);
  const [selectedReceivable, setSelectedReceivable] =
    useState<AccountReceivableOverview | null>(null);
  const [payablePayments, setPayablePayments] = useState<
    PayablePayment[] | null
  >(null);
  const [receivableCollections, setReceivableCollections] = useState<
    ReceivableCollection[] | null
  >(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Table filter/sort — independent per table; el filtro de sucursal (page-level)
  // relanza ambas listas.
  const ap = useTableFilter(
    initialOverview.payables,
    financesApi.getPayables,
    branchId,
  );
  const ar = useTableFilter(
    initialOverview.receivables,
    financesApi.getReceivables,
    branchId,
  );

  // Al cambiar de sucursal, recargar el overview para que las tarjetas de totales
  // reflejen el filtro (omitiendo el primer render: el loader ya trajo los datos).
  const isFirstOverviewRender = useRef(true);
  useEffect(() => {
    if (isFirstOverviewRender.current) {
      isFirstOverviewRender.current = false;
      return;
    }
    let cancelled = false;
    financesApi
      .getAccountsOverview(branchId || null)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => {
        /* se conserva el overview previo si falla */
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  // Currency formatting
  const currencySymbol =
    currencies.find((c) => Number(c.currency_id) === selectedCurrencyId)
      ?.symbol ?? "₡";
  const fmt = (value: number | string | null | undefined) =>
    formatAmount(value, selectedCurrencyId, exchangeRates, currencySymbol);

  // Stats always reflect full overview, not filtered rows
  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(
    () => ({
      totalCxP: overview.payables.reduce(
        (s, p) => s + Number(p.balance_due ?? 0),
        0,
      ),
      totalCxC: overview.receivables.reduce(
        (s, r) => s + Number(r.balance_due ?? 0),
        0,
      ),
      vencidoCxP: overview.payables
        .filter((p) => !p.is_paid && p.due_date < today)
        .reduce((s, p) => s + Number(p.balance_due ?? 0), 0),
      vencidoCxC: overview.receivables
        .filter((r) => !r.is_paid && r.due_date < today)
        .reduce((s, r) => s + Number(r.balance_due ?? 0), 0),
    }),
    [overview, today],
  );

  // Modal open handlers
  async function handlePayableClick(row: AccountPayableOverview) {
    setSelectedPayable(row);
    setPayablePayments(null);
    setDetailLoading(true);
    try {
      setPayablePayments(
        await financesApi.getPayablePayments(row.purchase_account_payable_id),
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleReceivableClick(row: AccountReceivableOverview) {
    setSelectedReceivable(row);
    setReceivableCollections(null);
    setDetailLoading(true);
    try {
      setReceivableCollections(
        await financesApi.getReceivableCollections(
          row.sale_account_receivable_id,
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setSelectedPayable(null);
    setSelectedReceivable(null);
    setPayablePayments(null);
    setReceivableCollections(null);
  }

  const isModalOpen = selectedPayable !== null || selectedReceivable !== null;

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
              Cuentas
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Resumen consolidado de cuentas por pagar a proveedores y cuentas
              por cobrar de ventas a credito.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Contexto principal
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {currentTenantName}
            </p>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total por pagar"
          value={fmt(stats.totalCxP)}
          icon={<IconShoppingCart />}
          sublabel="Saldo pendiente de pago"
          accent
        />
        <StatCard
          label="Total por cobrar"
          value={fmt(stats.totalCxC)}
          icon={<IconTrendingUp />}
          sublabel="Saldo pendiente de cobro"
        />
        <StatCard
          label="Pagos vencidos"
          value={fmt(stats.vencidoCxP)}
          icon={<IconCheckCircle />}
          sublabel="Cuentas por pagar vencidas"
        />
        <StatCard
          label="Cobros vencidos"
          value={fmt(stats.vencidoCxC)}
          icon={<IconCreditCard />}
          sublabel="Cuentas por cobrar vencidas"
        />
      </section>

      {/* Filtros: sucursal (re-fetch) + moneda (recalculo local) */}
      {(branches.length > 1 || currencies.length > 1) && (
        <section className="mb-6 flex flex-wrap items-end gap-6 rounded-2xl border border-gray-200 bg-white px-5 py-4">
          {branches.length > 1 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                Sucursal
              </p>
              <div className="w-64">
                <Select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  options={[
                    { value: "", label: "Todas las sucursales" },
                    ...branches.map((b) => ({
                      value: b.branch_id,
                      label: b.branch_name,
                    })),
                  ]}
                />
              </div>
            </div>
          )}
          {currencies.length > 1 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                Mostrar montos en
              </p>
              <div className="w-64">
                <Select
                  value={String(selectedCurrencyId)}
                  onChange={(e) => setSelectedCurrencyId(Number(e.target.value))}
                  options={currencies.map((c) => ({
                    value: String(c.currency_id),
                    label: `${c.currency_code} — ${c.currency_name}`,
                  }))}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Tables grid */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* AP Table */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Cuentas por pagar
          </h2>
          <TableFilterBar
            status={ap.status}
            sortBy={ap.sortBy}
            sortDir={ap.sortDir}
            onStatusChange={ap.onStatusChange}
            onSortByChange={ap.onSortByChange}
            onSortDirToggle={ap.onSortDirToggle}
          />
          <Table
            columns={[
              { key: "supplier_name", label: "Proveedor", width: "20%" },
              {
                key: "total_amount",
                label: "Total",
                width: "15%",
                render: (value) => fmt(value as number | string),
              },
              {
                key: "payment_count",
                label: "Abonado",
                width: "15%",
                render: (_value, row: AccountPayableOverview) =>
                  fmt(
                    Number(row.total_amount ?? 0) -
                      Number(row.balance_due ?? 0),
                  ),
              },
              {
                key: "balance_due",
                label: "Pendiente",
                width: "15%",
                render: (value) => fmt(value as number | string),
              },
              {
                key: "due_date",
                label: "Limite",
                width: "14%",
                render: (value) => formatDate(value as string),
              },
              {
                key: "account_payable_status_name",
                label: "Estado",
                width: "17%",
                render: (_value, row: AccountPayableOverview) => (
                  <Badge
                    variant={getPayableStatusTone(
                      row.account_payable_status_name,
                    )}
                  >
                    {row.account_payable_status_name}
                  </Badge>
                ),
              },
            ]}
            data={ap.rows}
            isLoading={ap.loading}
            onRowClick={handlePayableClick}
            emptyMessage="Sin cuentas por pagar pendientes"
          />
        </div>

        {/* AR Table */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Cuentas por cobrar
          </h2>
          <TableFilterBar
            status={ar.status}
            sortBy={ar.sortBy}
            sortDir={ar.sortDir}
            onStatusChange={ar.onStatusChange}
            onSortByChange={ar.onSortByChange}
            onSortDirToggle={ar.onSortDirToggle}
          />
          <Table
            columns={[
              {
                key: "digital_sale_invoice_id",
                label: "Factura",
                width: "15%",
                render: (value) =>
                  value ? (
                    <span className="font-mono text-xs text-gray-700">
                      {String(value).slice(0, 8)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Sin factura</span>
                  ),
              },
              {
                key: "total_amount",
                label: "Total",
                width: "16%",
                render: (value) => fmt(value as number | string),
              },
              {
                key: "collection_count",
                label: "Abonado",
                width: "16%",
                render: (_value, row: AccountReceivableOverview) =>
                  fmt(
                    Number(row.total_amount ?? 0) -
                      Number(row.balance_due ?? 0),
                  ),
              },
              {
                key: "balance_due",
                label: "Pendiente",
                width: "16%",
                render: (value) => fmt(value as number | string),
              },
              {
                key: "due_date",
                label: "Limite",
                width: "15%",
                render: (value) => formatDate(value as string),
              },
              {
                key: "account_receivable_status_name",
                label: "Estado",
                width: "15%",
                render: (_value, row: AccountReceivableOverview) => (
                  <Badge
                    variant={getReceivableStatusTone(
                      row.account_receivable_status_name,
                    )}
                  >
                    {row.account_receivable_status_name}
                  </Badge>
                ),
              },
            ]}
            data={ar.rows}
            isLoading={ar.loading}
            onRowClick={handleReceivableClick}
            emptyMessage="Sin cuentas por cobrar pendientes"
          />
        </div>
      </section>

      {/* AP Detail Modal */}
      {selectedPayable && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Detalle — Cuenta por pagar"
          size="lg"
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <SectionTitle>Resumen</SectionTitle>
              <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
                <DetailRow
                  label="Proveedor"
                  value={selectedPayable.supplier_name}
                />
                <DetailRow
                  label="Total"
                  value={fmt(selectedPayable.total_amount)}
                />
                <DetailRow
                  label="Abonado"
                  value={fmt(
                    Number(selectedPayable.total_amount ?? 0) -
                      Number(selectedPayable.balance_due ?? 0),
                  )}
                />
                <DetailRow
                  label="Pendiente"
                  value={
                    <span className="font-semibold text-red-600">
                      {fmt(selectedPayable.balance_due)}
                    </span>
                  }
                />
                <DetailRow
                  label="Fecha emision"
                  value={formatDate(selectedPayable.created_at)}
                />
                <DetailRow
                  label="Fecha limite"
                  value={formatDate(selectedPayable.due_date)}
                />
                <DetailRow
                  label="Alerta"
                  value={
                    <AlertStatusBadge
                      dueDate={selectedPayable.due_date}
                      alertConfig={overview.payables_alert_config}
                    />
                  }
                />
                {selectedPayable.last_payment_date && (
                  <DetailRow
                    label="Ultimo pago"
                    value={formatDate(selectedPayable.last_payment_date)}
                  />
                )}
              </div>
            </div>

            <ModalHistorySection
              title="Historial de pagos"
              loading={detailLoading}
            >
              <Table
                columns={[
                  {
                    key: "payment_date",
                    label: "Fecha",
                    width: "18%",
                    render: (value) => formatDate(value as string),
                  },
                  {
                    key: "amount_paid",
                    label: "Monto",
                    width: "20%",
                    render: (value) => fmt(value as number | string),
                  },
                  {
                    key: "payment_method_name",
                    label: "Metodo",
                    width: "20%",
                    render: (value) => (value as string | null) ?? "—",
                  },
                  {
                    key: "payment_reference",
                    label: "Referencia",
                    width: "22%",
                    render: (value) => (value as string | null) ?? "—",
                  },
                  {
                    key: "notes",
                    label: "Notas",
                    width: "20%",
                    render: (value) => (value as string | null) ?? "—",
                  },
                ]}
                data={payablePayments ?? []}
                emptyMessage="Sin pagos registrados"
              />
            </ModalHistorySection>
          </div>
        </Modal>
      )}

      {/* AR Detail Modal */}
      {selectedReceivable && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Detalle — Cuenta por cobrar"
          size="lg"
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <SectionTitle>Resumen</SectionTitle>
              <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
                <DetailRow
                  label="Cliente"
                  value={selectedReceivable.customer_name ?? "Sin nombre"}
                />
                {selectedReceivable.customer_document && (
                  <DetailRow
                    label="Cedula"
                    value={selectedReceivable.customer_document}
                  />
                )}
                {selectedReceivable.digital_sale_invoice_id && (
                  <DetailRow
                    label="Factura digital"
                    value={
                      <span className="font-mono text-xs">
                        {selectedReceivable.digital_sale_invoice_id}
                      </span>
                    }
                  />
                )}
                <DetailRow
                  label="Total"
                  value={fmt(selectedReceivable.total_amount)}
                />
                <DetailRow
                  label="Abonado"
                  value={fmt(
                    Number(selectedReceivable.total_amount ?? 0) -
                      Number(selectedReceivable.balance_due ?? 0),
                  )}
                />
                <DetailRow
                  label="Pendiente"
                  value={
                    <span className="font-semibold text-red-600">
                      {fmt(selectedReceivable.balance_due)}
                    </span>
                  }
                />
                <DetailRow
                  label="Fecha emision"
                  value={formatDate(selectedReceivable.created_at)}
                />
                <DetailRow
                  label="Fecha limite"
                  value={formatDate(selectedReceivable.due_date)}
                />
                <DetailRow
                  label="Alerta"
                  value={
                    <AlertStatusBadge
                      dueDate={selectedReceivable.due_date}
                      alertConfig={overview.receivables_alert_config}
                    />
                  }
                />
                {selectedReceivable.last_collection_date && (
                  <DetailRow
                    label="Ultimo cobro"
                    value={formatDate(selectedReceivable.last_collection_date)}
                  />
                )}
              </div>
            </div>

            <ModalHistorySection
              title="Historial de cobros"
              loading={detailLoading}
            >
              <Table
                columns={[
                  {
                    key: "payment_date",
                    label: "Fecha",
                    width: "18%",
                    render: (value) => formatDate(value as string),
                  },
                  {
                    key: "amount_paid",
                    label: "Monto (CRC)",
                    width: "18%",
                    render: (value) => fmt(value as number | string),
                  },
                  {
                    key: "payment_method_name",
                    label: "Metodo",
                    width: "18%",
                    render: (value) => (value as string | null) ?? "—",
                  },
                  {
                    key: "payment_reference",
                    label: "Referencia",
                    width: "22%",
                    render: (value) => (value as string | null) ?? "—",
                  },
                  {
                    key: "notes",
                    label: "Notas",
                    width: "24%",
                    render: (value) => (value as string | null) ?? "—",
                  },
                ]}
                data={receivableCollections ?? []}
                emptyMessage="Sin cobros registrados"
              />
            </ModalHistorySection>
          </div>
        </Modal>
      )}
    </div>
  );
}
