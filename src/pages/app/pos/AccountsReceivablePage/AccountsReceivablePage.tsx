import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { accountsReceivableApi } from "@/api/accounts-receivable.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";

import { useAuth } from "@/context/AuthContext";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Pagination, Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";

import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { useTableQuery } from "@/hooks/useTableQuery";
import { useDisplayCurrency } from "@/context/CurrencyContext";
import { bsToUsd, formatBs, formatUsd } from "@/utils/dualCurrency";

import {
  IconCheckCircle,
  IconCreditCard,
  IconShoppingCart,
} from "@/assets/icons";

import type { CreateCollectionRequest } from "@/interfaces/api/requests/AccountsReceivableRequests.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  SaleAccountReceivable,
  UpdatedSaleAccountReceivable,
} from "@/interfaces/entities/AccountReceivable.interface";
import type { AccountsReceivablePageLoaderData } from "@/router/loaders/accounts-receivable.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaymentMethodName,
  getReceivableStatusTone,
} from "@/utils/accounts-receivable";

interface CollectionFormState {
  sale_account_receivable_id: string;
  amount_paid: string;
  payment_method_id: string;
  payment_reference: string;
  currency_id: string;
}

const BASE_CURRENCY_ID = 1; // VES

const emptyCollectionForm: CollectionFormState = {
  sale_account_receivable_id: "",
  amount_paid: "",
  payment_method_id: "",
  payment_reference: "",
  currency_id: String(BASE_CURRENCY_ID),
};

export function AccountsReceivablePage() {
  const { data } = useLoaderData() as {
    data: Promise<AccountsReceivablePageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {({ receivables, total, page, limit, catalogs, isSuperuser, tenants }) => (
        <AccountsReceivablePageContent
          receivables={receivables}
          total={total}
          page={page}
          limit={limit}
          catalogs={catalogs}
          isSuperuser={isSuperuser}
          tenants={tenants}
        />
      )}
    </DeferredPage>
  );
}

function AccountsReceivablePageContent({
  receivables: initialReceivables,
  total: initialTotal,
  page: initialPage,
  limit: initialLimit,
  catalogs,
  isSuperuser,
  tenants,
}: Pick<
  AccountsReceivablePageLoaderData,
  "receivables" | "total" | "page" | "limit" | "catalogs" | "isSuperuser" | "tenants"
>) {
  const { user } = useAuth();
  const usdRate = useCurrentExchangeRate();
  const { displayCurrency } = useDisplayCurrency();

  const canManage = user?.role.role_id === 1 || user?.role.role_id === 2;

  const [receivables, setReceivables] =
    useState<SaleAccountReceivable[]>(initialReceivables);
  const [total, setTotal] = useState(initialTotal);
  const { page, limit, setPage, handleLimitChange } = useTableQuery({
    initialPage,
    initialLimit,
  });
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] =
    useState<SaleAccountReceivable | null>(null);
  const [collectionForm, setCollectionForm] =
    useState<CollectionFormState>(emptyCollectionForm);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailReceivable, setDetailReceivable] =
    useState<SaleAccountReceivable | null>(null);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const loadPage = async (nextPage: number, nextLimit: number) => {
    setIsLoadingPage(true);
    try {
      const response = await accountsReceivableApi.listReceivables(
        nextPage,
        nextLimit,
      );
      setReceivables(response.receivables);
      setTotal(response.total);
      setPage(response.page);
    } catch {
      setToast({
        mode: "error",
        message: "No se pudo cargar la página solicitada",
      });
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handlePageChange = async (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || isLoadingPage) return;
    await loadPage(nextPage, limit);
  };

  const onLimitChange = async (nextLimit: number) => {
    if (isLoadingPage) return;
    handleLimitChange(nextLimit);
    await loadPage(1, nextLimit);
  };

  const filteredReceivables = useMemo(() => {
    const query = search.trim().toLowerCase();

    return receivables.filter((item) => {
      const matchesTenant =
        !isSuperuser ||
        tenantFilter === "all" ||
        item.tenant_id === tenantFilter;

      if (!matchesTenant) return false;
      if (!query) return true;

      return (
        (item.customer_name ?? "").toLowerCase().includes(query) ||
        item.sale_id.toLowerCase().includes(query) ||
        (item.customer_document ?? "").toLowerCase().includes(query)
      );
    });
  }, [isSuperuser, receivables, search, tenantFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: filteredReceivables.length,
      open: filteredReceivables.filter((item) => !item.is_paid).length,
      overdue: filteredReceivables.filter(
        (item) => !item.is_paid && item.due_date < today,
      ).length,
      balance: filteredReceivables.reduce(
        (acc, item) => acc + Number(item.balance_due ?? 0),
        0,
      ),
    };
  }, [filteredReceivables]);

  const openDetail = (receivable: SaleAccountReceivable) => {
    setDetailReceivable(receivable);
    setIsDetailOpen(true);
  };

  const openCollectionModal = (receivable: SaleAccountReceivable) => {
    setSelectedReceivable(receivable);
    const firstMethod = catalogs.payment_methods.filter(
      (m) => Number(m.payment_method_id) !== 5,
    )[0];
    setCollectionForm({
      sale_account_receivable_id: receivable.sale_account_receivable_id,
      amount_paid: String(Number(receivable.balance_due ?? 0)),
      payment_method_id: String(firstMethod?.payment_method_id ?? ""),
      payment_reference: "",
      currency_id: String(BASE_CURRENCY_ID),
    });
    setCollectionError(null);
    setExchangeRate(1);
    setRateError(null);
    setIsCollectionModalOpen(true);
  };

  const closeCollectionModal = () => {
    setIsCollectionModalOpen(false);
    setSelectedReceivable(null);
    setCollectionForm(emptyCollectionForm);
    setCollectionError(null);
    setExchangeRate(null);
    setRateError(null);
    setIsFetchingRate(false);
  };

  // Fetch latest rate from selected currency to VES whenever currency changes.
  useEffect(() => {
    const selectedCurrencyId = Number(collectionForm.currency_id);
    if (!isCollectionModalOpen || !selectedCurrencyId) return;

    if (selectedCurrencyId === BASE_CURRENCY_ID) {
      setExchangeRate(1);
      setRateError(null);
      return;
    }

    let cancelled = false;
    setIsFetchingRate(true);
    setRateError(null);
    exchangeRateApi
      .getLatest()
      .then((rate) => {
        if (cancelled) return;
        if (!rate) {
          setExchangeRate(null);
          setRateError(
            "No hay tasa de cambio configurada para esta moneda. Configúrela en Ajustes > Tipos de cambio.",
          );
          return;
        }
        setExchangeRate(Number(rate.rate));
      })
      .catch(() => {
        if (cancelled) return;
        setExchangeRate(null);
        setRateError("Error al consultar la tasa de cambio.");
      })
      .finally(() => {
        if (!cancelled) setIsFetchingRate(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collectionForm.currency_id, isCollectionModalOpen]);

  const convertedAmountCrc = useMemo(() => {
    const original = Number(collectionForm.amount_paid);
    if (!original || !exchangeRate) return 0;
    return Math.round(original * exchangeRate * 1000) / 1000;
  }, [collectionForm.amount_paid, exchangeRate]);

  const selectedCurrency = useMemo(
    () =>
      catalogs.currencies.find(
        (c) => Number(c.currency_id) === Number(collectionForm.currency_id),
      ),
    [catalogs.currencies, collectionForm.currency_id],
  );

  const isForeignCurrency =
    Number(collectionForm.currency_id) !== BASE_CURRENCY_ID;

  const applyUpdatedReceivable = (updated: UpdatedSaleAccountReceivable) => {
    setReceivables((prev) =>
      prev.map((item) =>
        item.sale_account_receivable_id === updated.sale_account_receivable_id
          ? { ...item, ...updated }
          : item,
      ),
    );
  };

  const handleRegisterCollection = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedReceivable) return;

    const original = Number(collectionForm.amount_paid);
    const paymentMethodId = Number(collectionForm.payment_method_id);
    const currencyId = Number(collectionForm.currency_id) || BASE_CURRENCY_ID;
    const maxAmountCrc = Number(selectedReceivable.balance_due ?? 0);

    if (!original || original <= 0) {
      setCollectionError("Ingrese un monto válido para el cobro");
      return;
    }

    if (!paymentMethodId) {
      setCollectionError("Seleccione un método de pago");
      return;
    }

    if (
      currencyId !== BASE_CURRENCY_ID &&
      (!exchangeRate || exchangeRate <= 0)
    ) {
      setCollectionError(
        rateError ?? "Tasa de cambio no disponible para la moneda seleccionada",
      );
      return;
    }

    const rate = currencyId === BASE_CURRENCY_ID ? 1 : (exchangeRate as number);
    const amountInCrc = Math.round(original * rate * 1000) / 1000;

    if (amountInCrc > maxAmountCrc + 0.01) {
      setCollectionError(
        "El cobro no puede superar el saldo pendiente (equivalente en bolivares).",
      );
      return;
    }

    setCollectionError(null);
    setIsSubmittingCollection(true);

    try {
      const payload: CreateCollectionRequest = {
        sale_account_receivable_id:
          selectedReceivable.sale_account_receivable_id,
        amount_paid: amountInCrc,
        payment_method_id: paymentMethodId,
        currency_id: currencyId,
        original_amount: original,
        exchange_rate: rate,
        payment_reference: collectionForm.payment_reference || undefined,
      };

      const response = await accountsReceivableApi.registerCollection(payload);

      applyUpdatedReceivable(response.sale_account_receivable);
      closeCollectionModal();
      setToast({ mode: "success", message: "Cobro registrado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el cobro",
      });
    } finally {
      setIsSubmittingCollection(false);
    }
  };

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
        eyebrow="POS"
        title="Cuentas por cobrar"
        description="Monitoree el saldo pendiente de las ventas a crédito y registre cobros conforme los clientes realizan abonos."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registros visibles"
          value={String(stats.total)}
          icon={<IconShoppingCart />}
          sublabel="Cuentas por cobrar según filtros"
          accent
        />
        <StatCard
          label="Abiertas"
          value={String(stats.open)}
          icon={<IconCreditCard />}
          sublabel="Con saldo pendiente"
        />
        <StatCard
          label="Vencidas"
          value={String(stats.overdue)}
          icon={<IconCheckCircle />}
          sublabel="Requieren atención inmediata"
        />
        <StatCard
          label="Saldo pendiente"
          value={
            displayCurrency === "VES"
              ? formatBs(stats.balance)
              : bsToUsd(stats.balance, usdRate) !== null
                ? formatUsd(bsToUsd(stats.balance, usdRate)!)
                : "—"
          }
          icon={<IconCreditCard />}
          sublabel={
            displayCurrency === "VES"
              ? bsToUsd(stats.balance, usdRate) !== null
                ? `≈ ${formatUsd(bsToUsd(stats.balance, usdRate)!)}`
                : "Sin tasa configurada"
              : `≈ ${formatBs(stats.balance)}`
          }
        />
      </section>

      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 lg:flex-row">
            <Input
              label="Buscar cuenta"
              placeholder="Buscar por cliente, venta o documento"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full lg:max-w-md"
            />

            {isSuperuser && (
              <Select
                label="Filtrar tenant"
                value={tenantFilter}
                onChange={(event) => setTenantFilter(event.target.value)}
                options={[
                  { value: "all", label: "Todos los tenants" },
                  ...tenants.map((tenant) => ({
                    value: tenant.tenant_id,
                    label: tenant.tenant_name,
                  })),
                ]}
                className="w-full lg:max-w-xs"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filteredReceivables.length} de {total} cuenta
              {total === 1 ? "" : "s"} (página {page} de {totalPages})
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          La búsqueda y el filtro de tenant aplican solo sobre la página
          cargada. Cambie de página para revisar otros registros.
        </p>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <Table
          columns={[
            {
              key: "customer_name",
              label: "Cliente",
              width: "17%",
              render: (value) => (value as string | null) ?? "—",
            },
            {
              key: "sale_id",
              label: "Venta",
              width: "12%",
              render: (value) => (
                <span className="font-mono text-xs text-gray-500">
                  {String(value).slice(0, 8)}…
                </span>
              ),
            },
            {
              key: "account_receivable_status_name",
              label: "Estado CxC",
              width: "12%",
              render: (value) => (
                <Badge variant={getReceivableStatusTone(String(value))}>
                  {String(value)}
                </Badge>
              ),
            },
            {
              key: "total_amount",
              label: "Total",
              width: "10%",
              render: (value) => (
                <DualCurrencyAmount
                  amountBs={Number(value)}
                  rate={usdRate}
                  hideSecondary
                />
              ),
            },
            {
              key: "amount_paid",
              label: "Cobrado",
              width: "10%",
              render: (value) => (
                <DualCurrencyAmount
                  amountBs={Number(value)}
                  rate={usdRate}
                  hideSecondary
                />
              ),
            },
            {
              key: "balance_due",
              label: "Pendiente",
              width: "10%",
              render: (value) => (
                <DualCurrencyAmount
                  amountBs={Number(value)}
                  rate={usdRate}
                  bold
                  hideSecondary
                />
              ),
            },
            {
              key: "due_date",
              label: "Vence",
              width: "10%",
              render: (value) => formatDate(String(value)),
            },
            {
              key: "actions",
              label: "Acciones",
              width: "20%",
              render: (_value, receivable: SaleAccountReceivable) => (
                <div
                  className="flex flex-nowrap items-center gap-2 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canManage && !receivable.is_paid && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openCollectionModal(receivable)}
                    >
                      Registrar cobro
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={filteredReceivables}
          emptyMessage="No hay cuentas por cobrar para mostrar"
          onRowClick={(row) => openDetail(row as SaleAccountReceivable)}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          loading={isLoadingPage}
          limit={limit}
          onLimitChange={onLimitChange}
          total={total}
        />
      </section>

      {/* Collection registration modal */}
      <Modal
        isOpen={isCollectionModalOpen}
        onClose={closeCollectionModal}
        title="Registrar cobro"
      >
        <form className="space-y-4" onSubmit={handleRegisterCollection}>
          {selectedReceivable && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {selectedReceivable.customer_name ?? "Cliente sin nombre"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Venta {selectedReceivable.sale_id}
              </p>
              <p className="mt-3 text-sm text-gray-600">
                Saldo pendiente actual:
              </p>
              <DualCurrencyAmount
                amountBs={Number(selectedReceivable.balance_due)}
                rate={usdRate}
                bold
              />
            </div>
          )}

          <Select
            label="Moneda del abono"
            value={collectionForm.currency_id}
            onChange={(event) =>
              setCollectionForm((prev) => ({
                ...prev,
                currency_id: event.target.value,
              }))
            }
            options={catalogs.currencies.map((c) => ({
              value: c.currency_id,
              label: `${c.currency_code} (${c.symbol}) — ${c.currency_name}`,
            }))}
            required
          />

          <Input
            label={`Monto del cobro${
              selectedCurrency ? ` (${selectedCurrency.currency_code})` : ""
            }`}
            type="number"
            min="0.01"
            step="0.001"
            value={collectionForm.amount_paid}
            onChange={(event) =>
              setCollectionForm((prev) => ({
                ...prev,
                amount_paid: event.target.value,
              }))
            }
            required
          />

          {isForeignCurrency && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              {isFetchingRate ? (
                <p>Consultando tasa de cambio...</p>
              ) : rateError ? (
                <p className="text-red-600">{rateError}</p>
              ) : exchangeRate ? (
                <>
                  <p>
                    Tasa aplicada: 1 {selectedCurrency?.currency_code} ={" "}
                    {formatCurrency(exchangeRate)}
                  </p>
                  <p className="mt-1 font-semibold">
                    Equivalente en bolivares:{" "}
                    {formatCurrency(convertedAmountCrc)}
                  </p>
                </>
              ) : null}
            </div>
          )}

          <Select
            label="Método de pago"
            value={collectionForm.payment_method_id}
            onChange={(event) =>
              setCollectionForm((prev) => ({
                ...prev,
                payment_method_id: event.target.value,
              }))
            }
            options={catalogs.payment_methods
              .filter((method) => Number(method.payment_method_id) !== 5)
              .map((method) => ({
                value: method.payment_method_id,
                label: formatPaymentMethodName(method.name),
              }))}
            placeholder="Seleccionar método"
            required
          />

          <Input
            label="Referencia"
            value={collectionForm.payment_reference}
            onChange={(event) =>
              setCollectionForm((prev) => ({
                ...prev,
                payment_reference: event.target.value,
              }))
            }
            hint="Número de transferencia, voucher o comentario breve."
          />

          {collectionError && (
            <p className="text-xs text-red-500">{collectionError}</p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmittingCollection}
              onClick={closeCollectionModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmittingCollection}
              disabled={
                isFetchingRate ||
                (isForeignCurrency && (!exchangeRate || Boolean(rateError)))
              }
            >
              Registrar cobro
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailReceivable(null);
        }}
        title="Detalle de la cuenta"
      >
        {detailReceivable && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Cliente
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {detailReceivable.customer_name ?? "Sin nombre"}
              </p>
              {detailReceivable.customer_document && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {detailReceivable.customer_document}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Venta</p>
                <p className="mt-1 font-mono text-xs text-gray-700">
                  {detailReceivable.sale_id.slice(0, 16)}…
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Estado</p>
                <div className="mt-1">
                  <Badge
                    variant={getReceivableStatusTone(
                      detailReceivable.account_receivable_status_name,
                    )}
                  >
                    {detailReceivable.account_receivable_status_name}
                  </Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Fecha de vencimiento</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {formatDate(detailReceivable.due_date)}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Cobros registrados</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {detailReceivable.collection_count}
                </p>
                {detailReceivable.last_collection_date && (
                  <p className="text-xs text-gray-400">
                    Último:{" "}
                    {formatDateTime(detailReceivable.last_collection_date)}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Subtotal</span>
                <DualCurrencyAmount
                  amountBs={Number(detailReceivable.subtotal)}
                  rate={usdRate}
                  align="right"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Impuesto</span>
                <DualCurrencyAmount
                  amountBs={Number(detailReceivable.tax_amount)}
                  rate={usdRate}
                  align="right"
                />
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 py-1 pt-2">
                <span className="text-sm font-semibold text-gray-900">
                  Total
                </span>
                <DualCurrencyAmount
                  amountBs={Number(detailReceivable.total_amount)}
                  rate={usdRate}
                  bold
                  align="right"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Cobrado</span>
                <DualCurrencyAmount
                  amountBs={Number(detailReceivable.amount_paid)}
                  rate={usdRate}
                  amountClassName="font-medium text-green-600"
                  align="right"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold text-gray-900">
                  Saldo pendiente
                </span>
                <DualCurrencyAmount
                  amountBs={Number(detailReceivable.balance_due)}
                  rate={usdRate}
                  amountClassName="font-semibold text-blue-700"
                  align="right"
                />
              </div>
            </div>

            {canManage && !detailReceivable.is_paid && (
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setIsDetailOpen(false);
                    openCollectionModal(detailReceivable);
                  }}
                >
                  Registrar cobro
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
