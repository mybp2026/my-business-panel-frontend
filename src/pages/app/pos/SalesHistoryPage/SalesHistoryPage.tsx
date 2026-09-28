import { useEffect, useRef, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, Pagination } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { useTableQuery } from "@/hooks/useTableQuery";

import {
  SALES_PAGE_LIMIT,
  getSalesByBranch,
  getSalesByTenant,
  type SalesHistoryPageLoaderData,
} from "@/router/loaders/sale.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import type { SaleListItem } from "@/interfaces/entities/Sale.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { SaleDetailModal } from "./SaleDetailModal";
import { CreditDebitNotesListSection } from "./CreditDebitNotesListSection";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  });

export function SalesHistoryPage() {
  const { data } = useLoaderData() as {
    data: Promise<SalesHistoryPageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {({ branches, initialSales, initialBranchId, creditDebitNotes }) => (
        <SalesHistoryPageContent
          branches={branches}
          initialSales={initialSales}
          initialBranchId={initialBranchId}
          creditDebitNotes={creditDebitNotes}
        />
      )}
    </DeferredPage>
  );
}

function SalesHistoryPageContent({
  branches,
  initialSales,
  initialBranchId,
  creditDebitNotes,
}: Pick<
  SalesHistoryPageLoaderData,
  "branches" | "initialSales" | "initialBranchId" | "creditDebitNotes"
>) {
  const { user } = useAuth();
  const exchangeRate = useCurrentExchangeRate();

  const roleId = user?.role.role_id ?? 1;
  const canView = roleId === 2 || roleId === 3;

  const [branchId, setBranchId] = useState(initialBranchId);
  const { page, limit, sortDir, setPage, handleLimitChange, handleSortChange } =
    useTableQuery({
      initialPage: initialSales.page ?? 1,
      initialLimit: initialSales.limit ?? SALES_PAGE_LIMIT,
      initialSortBy: "sale_date",
      initialSortDir: "desc",
    });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sales, setSales] = useState<SaleListItem[]>(
    initialSales.results ?? [],
  );
  const [total, setTotal] = useState(initialSales.total);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<SaleListItem | null>(null);
  const [searchId, setSearchId] = useState("");
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const copySaleId = async (saleId: string) => {
    try {
      await navigator.clipboard.writeText(saleId);
      setToast({ mode: "success", message: "ID copiado al portapapeles" });
    } catch {
      setToast({ mode: "error", message: "No se pudo copiar el ID" });
    }
  };

  const sortedSales = [...sales].sort((a, b) => {
    const diff =
      new Date(b.sale_date ?? b.created_at ?? 0).getTime() -
      new Date(a.sale_date ?? a.created_at ?? 0).getTime();
    return sortDir === "asc" ? -diff : diff;
  });

  const normalizedSearch = searchId.trim().toLowerCase();
  const filteredSales = sortedSales.filter((s) => {
    if (
      normalizedSearch &&
      !String(s.sale_id ?? "")
        .toLowerCase()
        .includes(normalizedSearch)
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!branchId) {
      setSales([]);
      setTotal(0);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    // dateTo es un input tipo date (sin hora): agregamos el limite del dia
    // para que incluya las ventas de esa fecha completa, no solo hasta
    // medianoche.
    const dateToBoundary = dateTo ? `${dateTo}T23:59:59.999` : undefined;
    const fetchFn =
      branchId === "all"
        ? getSalesByTenant(page, limit, dateFrom || undefined, dateToBoundary)
        : getSalesByBranch(
            branchId,
            page,
            limit,
            dateFrom || undefined,
            dateToBoundary,
          );
    fetchFn
      .then((res) => {
        if (cancelled) return;
        setSales(res.results ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => {
        setToast({
          mode: "error",
          message:
            err instanceof Error ? err.message : "Error al cargar ventas",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, page, limit, dateFrom, dateTo]);

  if (!canView) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-white rounded-2xl border border-gray-300 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Acceso restringido
          </h1>
          <p className="text-gray-600">
            Esta vista está disponible únicamente para roles de Gerente y
            Administrador.
          </p>
        </div>
      </div>
    );
  }

  const branchOptions = [
    { value: "", label: "Seleccione una sucursal" },
    { value: "all", label: "Todas las sucursales" },
    ...branches.map((b) => ({ value: b.branch_id, label: b.branch_name })),
  ];

  const columns: Column[] = [
    {
      key: "sale_id",
      label: "ID",
      width: "20%",
      render: (v: string) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            copySaleId(v);
          }}
          title="Copiar ID al portapapeles"
          className="font-mono text-xs text-gray-600 break-all text-left hover:text-blue-600 hover:underline cursor-pointer"
        >
          {v}
        </button>
      ),
    },
    { key: "branch_name", label: "Sucursal", width: "18%" },
    {
      key: "total_amount",
      label: "Total",
      width: "17%",
      render: (v: number) => (
        <DualCurrencyAmount
          amountBs={v}
          rate={exchangeRate}
          bold
          hideSecondary
        />
      ),
    },
    {
      key: "is_completed",
      label: "Estado",
      width: "10%",
      render: (v: boolean, row: SaleListItem) => {
        if (row.is_refunded) {
          return <Badge variant="red">Cancelada</Badge>;
        }
        if (row.return_transaction_id) {
          return <Badge variant="yellow">Reembolso parcial</Badge>;
        }
        return (
          <Badge variant={v ? "green" : "yellow"}>
            {v ? "Completada" : "Pendiente"}
          </Badge>
        );
      },
    },
    {
      key: "sale_date",
      label: "Fecha",
      width: "20%",
      sortable: true,
      render: (v: string, row: SaleListItem) => formatDate(v ?? row.created_at),
    },
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
        eyebrow="POS"
        title="Historial de ventas"
        description="Resumen paginado de las últimas ventas, filtradas por sucursal."
      />

      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Input
              label="Buscar por ID"
              placeholder="Pegue o escriba un ID de venta"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500 md:ml-auto">
            {filteredSales.length} de {total} venta{total !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          columns={columns}
          data={filteredSales}
          isLoading={isLoading}
          emptyMessage={
            branchId
              ? "No hay ventas registradas en esta sucursal"
              : "Seleccione una sucursal para ver las ventas"
          }
          onRowClick={(row) => setSelected(row)}
          sortBy="sale_date"
          sortDir={sortDir}
          onSortChange={handleSortChange}
          pageSize={{ value: limit, onChange: handleLimitChange }}
          filters={{
            branch: {
              value: branchId,
              onChange: (value) => {
                setBranchId(value);
                setPage(1);
              },
              options: branchOptions,
            },
            dateFrom: {
              value: dateFrom,
              onChange: (value) => {
                setDateFrom(value);
                setPage(1);
              },
            },
            dateTo: {
              value: dateTo,
              onChange: (value) => {
                setDateTo(value);
                setPage(1);
              },
            },
            onClear: () => {
              setDateFrom("");
              setDateTo("");
              setPage(1);
            },
          }}
        />
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={isLoading}
            total={total}
          />
        )}
      </div>

      <CreditDebitNotesListSection initialNotes={creditDebitNotes} />

      <SaleDetailModal
        isOpen={selected !== null}
        sale={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
