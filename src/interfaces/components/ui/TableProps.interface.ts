import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export interface Column {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render?: (value: any, row: any) => ReactNode;
}

export interface TableFilterOption {
  value: string;
  label: string;
}

export interface TableBranchFilter {
  value: string;
  onChange: (value: string) => void;
  options: TableFilterOption[];
  label?: string;
  placeholder?: string;
}

export interface TableDateFilter {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export interface TableFilters {
  branch?: TableBranchFilter;
  dateFrom?: TableDateFilter;
  dateTo?: TableDateFilter;
  onClear?: () => void;
}

export interface TablePageSize {
  value: number;
  onChange: (limit: number) => void;
  options?: number[];
}

export interface TableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  rowClassName?: string;
  onRowClick?: (row: any) => void;
  sortBy?: string;
  sortDir?: SortDirection;
  onSortChange?: (key: string) => void;
  filters?: TableFilters;
  /** Selector de resultados por pagina, renderizado siempre arriba de la tabla. */
  pageSize?: TablePageSize;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  total?: number;
  limitOptions?: number[];
}
