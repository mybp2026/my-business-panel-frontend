import { useState } from "react";
import type { SortDirection } from "@/interfaces/components/ui/TableProps.interface";

export const DEFAULT_TABLE_LIMIT = 100;

export interface UseTableQueryOptions {
  initialPage?: number;
  initialLimit?: number;
  initialSortBy?: string;
  initialSortDir?: SortDirection;
}

export interface UseTableQueryReturn {
  page: number;
  limit: number;
  offset: number;
  sortBy: string | undefined;
  sortDir: SortDirection;
  setPage: (page: number) => void;
  handleLimitChange: (limit: number) => void;
  handleSortChange: (key: string) => void;
  reset: () => void;
}

/**
 * Estado estandar de paginacion (limit/offset) y orden para tablas que
 * refetch-ean al backend. La pagina se resetea a 1 en cada cambio de
 * limite u orden para no quedar en una pagina fuera de rango.
 */
export function useTableQuery(
  options: UseTableQueryOptions = {},
): UseTableQueryReturn {
  const {
    initialPage = 1,
    initialLimit = DEFAULT_TABLE_LIMIT,
    initialSortBy,
    initialSortDir = "asc",
  } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy);
  const [sortDir, setSortDir] = useState<SortDirection>(initialSortDir);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleSortChange = (key: string) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const reset = () => {
    setPage(initialPage);
    setLimit(initialLimit);
    setSortBy(initialSortBy);
    setSortDir(initialSortDir);
  };

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortDir,
    setPage,
    handleLimitChange,
    handleSortChange,
    reset,
  };
}
