import { useEffect, useState } from "react";

import { financesApi } from "@/api/finances.api";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Table, Pagination } from "@/components/ui/Table";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExpenseHistoryRow } from "@/interfaces/entities/FnzExpense.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";

const PAGE_LIMIT = 20;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  BANK: "Transferencia bancaria",
  CREDIT_CARD: "Tarjeta de credito",
  CHECK: "Cheque",
  TRANSFER: "Transferencia",
};

interface ExpenseHistoryTableProps {
  branches: Branch[];
  currencies: Currency[];
  // Cada incremento del contador relanza la consulta (p.ej. tras registrar un gasto).
  refreshSignal?: number;
}

export function ExpenseHistoryTable({
  branches,
  currencies,
  refreshSignal = 0,
}: ExpenseHistoryTableProps) {
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ExpenseHistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (value: string, currencyId: number) => {
    const currency = currencies.find(
      (c) => Number(c.currency_id) === Number(currencyId),
    );
    const symbol = currency?.symbol ?? "₡";
    return `${symbol} ${Number(value ?? 0).toLocaleString("es-CR", {
      minimumFractionDigits: 2,
    })}`;
  };

  // Filtro de sucursal y paginacion re-consultan al backend (regla del repo).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    financesApi
      .getExpenseHistory({
        branchId: branchId || null,
        page,
        limit: PAGE_LIMIT,
      })
      .then((data) => {
        if (cancelled) return;
        setRows(data.results);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar gastos");
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, page, refreshSignal]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const branchOptions = [
    { value: "", label: "Todas las sucursales" },
    ...branches.map((b) => ({ value: b.branch_id, label: b.branch_name })),
  ];

  const columns: Column[] = [
    {
      key: "expense_date",
      label: "Fecha",
      width: "12%",
      render: (value: unknown) =>
        new Date(value as string).toLocaleDateString("es-CR"),
    },
    { key: "branch_name", label: "Sucursal", width: "15%" },
    {
      key: "category_name",
      label: "Categoria",
      width: "18%",
      render: (value: unknown, row: ExpenseHistoryRow) => (
        <div className="flex flex-col gap-1">
          <span className="text-gray-800">{value as string}</span>
          <Badge variant={row.is_fixed ? "red" : "yellow"}>
            {row.is_fixed ? "Fijo" : "Variable"}
          </Badge>
        </div>
      ),
    },
    {
      key: "description",
      label: "Descripcion",
      width: "17%",
      render: (value: unknown) => (
        <span className="text-gray-600">{(value as string) || "—"}</span>
      ),
    },
    {
      key: "payment_method",
      label: "Metodo",
      width: "13%",
      render: (value: unknown) =>
        PAYMENT_METHOD_LABELS[value as string] ?? (value as string),
    },
    {
      key: "total_amount",
      label: "Monto",
      width: "13%",
      render: (value: unknown, row: ExpenseHistoryRow) => (
        <span className="font-mono font-semibold text-red-700">
          {formatAmount(value as string, row.currency_id)}
        </span>
      ),
    },
    {
      key: "created_by_email",
      label: "Registrado por",
      width: "12%",
      render: (value: unknown) => (
        <span
          className="text-xs text-gray-500 truncate block max-w-[140px]"
          title={(value as string) ?? ""}
        >
          {(value as string) || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-60">
          <Select
            label="Sucursal"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            options={branchOptions}
          />
        </div>
        <div className="text-sm text-gray-500">
          {total} gasto{total !== 1 ? "s" : ""}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Table
        columns={columns}
        data={rows}
        isLoading={loading}
        emptyMessage="No hay gastos registrados para el filtro seleccionado"
      />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          loading={loading}
        />
      )}
    </div>
  );
}
