import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type {
  PaginationProps,
  TableFilters,
  TablePageSize,
  TableProps,
} from "@/interfaces/components/ui/TableProps.interface";

const DEFAULT_LIMIT_OPTIONS = [25, 50, 100, 200];

function PageSizeControl({ pageSize }: { pageSize: TablePageSize }) {
  const options = pageSize.options ?? DEFAULT_LIMIT_OPTIONS;
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
      Mostrar
      <select
        value={pageSize.value}
        onChange={(e) => pageSize.onChange(Number(e.target.value))}
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function TableToolbar({
  filters,
  pageSize,
}: {
  filters?: TableFilters;
  pageSize?: TablePageSize;
}) {
  const { branch, dateFrom, dateTo, onClear } = filters ?? {};
  const hasDateValue = !!dateFrom?.value || !!dateTo?.value;

  if (!branch && !dateFrom && !dateTo && !pageSize) return null;

  return (
    <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        {branch && (
          <div className="flex-1 max-w-xs">
            <Select
              label={branch.label ?? "Sucursal"}
              value={branch.value}
              onChange={(e) => branch.onChange(e.target.value)}
              options={branch.options}
              placeholder={branch.placeholder}
            />
          </div>
        )}
        {dateFrom && (
          <div className="flex-1 max-w-[10rem]">
            <Input
              label={dateFrom.label ?? "Desde"}
              type="date"
              value={dateFrom.value}
              onChange={(e) => dateFrom.onChange(e.target.value)}
            />
          </div>
        )}
        {dateTo && (
          <div className="flex-1 max-w-[10rem]">
            <Input
              label={dateTo.label ?? "Hasta"}
              type="date"
              value={dateTo.value}
              onChange={(e) => dateTo.onChange(e.target.value)}
            />
          </div>
        )}
        {onClear && hasDateValue && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpiar fechas
          </Button>
        )}
      </div>
      {pageSize && <PageSizeControl pageSize={pageSize} />}
    </div>
  );
}

export function Table({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No hay datos disponibles",
  rowClassName = "",
  onRowClick,
  sortBy,
  sortDir,
  onSortChange,
  filters,
  pageSize,
}: TableProps) {
  if (isLoading) {
    return (
      <>
        <TableToolbar filters={filters} pageSize={pageSize} />
        <div className="flex items-center justify-center py-12">
          <div className="inline-block w-6 h-6 border-3 border-accent-300 border-t-accent-500 rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!data || !data.length) {
    return (
      <>
        <TableToolbar filters={filters} pageSize={pageSize} />
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-gray-400"
            >
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </>
    );
  }

  const alignClass = (align?: "left" | "right" | "center") =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <>
      <TableToolbar filters={filters} pageSize={pageSize} />
      <div className="overflow-auto max-h-[540px] border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-(--accent-800)">
              {columns.map((col) => {
                const isSortable = col.sortable && onSortChange;
                const isActive = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-medium text-white ${alignClass(col.align)} ${
                      isSortable ? "cursor-pointer select-none" : ""
                    }`}
                    style={{ width: col.width }}
                    onClick={
                      isSortable ? () => onSortChange(col.key) : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSortable && (
                        <span className="text-[10px] leading-none opacity-80">
                          {isActive ? (sortDir === "desc" ? "▼" : "▲") : "⇅"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-gray-200 hover:bg-(--accent-100) transition-colors ${onRowClick ? "cursor-pointer" : ""} ${rowClassName}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2 text-gray-700 ${alignClass(col.align)}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  loading = false,
  limit,
  onLimitChange,
  total,
  limitOptions = DEFAULT_LIMIT_OPTIONS,
}: PaginationProps) {
  return (
    <div className="flex flex-col gap-3 mt-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Página <span className="font-medium">{page}</span> de{" "}
          <span className="font-medium">{totalPages}</span>
          {total != null && (
            <span className="text-gray-400"> ({total} en total)</span>
          )}
        </p>

        {onLimitChange && limit != null && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Mostrar
            <select
              value={limit}
              disabled={loading}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 disabled:opacity-50"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || loading}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
