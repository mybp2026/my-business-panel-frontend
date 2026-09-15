import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type { CreateSaleRequest } from "@/interfaces/api/requests/CreateSaleRequest.interface";
import type { PaginatedResponse } from "@/interfaces/api/responses/PaginatedResponse.interface";
import type {
  CreateSaleResult,
  InvoiceInfo,
  SaleCondition,
  SaleItemDetail,
  SaleListItem,
} from "@/interfaces/entities/Sale.interface";

export const saleApi = {
  async getSaleConditions(): Promise<SaleCondition[]> {
    try {
      const response = await fetch(`${url}/sale`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json: ApiResponse<SaleCondition[]> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error al obtener condiciones de venta",
      );
    }
  },

  async createFullSale(data: CreateSaleRequest): Promise<CreateSaleResult> {
    try {
      const response = await fetch(`${url}/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await response.json();
      if (!response.ok) {
        const message = Array.isArray(json?.message)
          ? json.message.join(", ")
          : (json?.message ?? json?.error ?? "Error al crear la venta");
        throw new Error(message);
      }
      const payload = (json as ApiResponse<CreateSaleResult>).data ?? json;
      return payload as CreateSaleResult;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al crear la venta",
      );
    }
  },

  async listByBranch(
    branchId: string,
    page = 1,
    limit = 100,
  ): Promise<PaginatedResponse<SaleListItem>> {
    try {
      const response = await fetch(
        `${url}/sale/${branchId}?page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );
      const json = await response.json();
      const data = (json as ApiResponse<unknown>).data ?? json;

      // The pagination decorator returns `{ results, total, page, limit }`.
      const normalized = data as PaginatedResponse<SaleListItem> & {
        items?: SaleListItem[];
        data?: SaleListItem[];
      };
      const results =
        normalized.results ?? normalized.items ?? normalized.data ?? [];
      return {
        results,
        total: normalized.total ?? results.length,
        page: normalized.page ?? page,
        limit: normalized.limit ?? limit,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error al obtener historial de ventas",
      );
    }
  },

  async listByTenant(
    page = 1,
    limit = 100,
  ): Promise<PaginatedResponse<SaleListItem>> {
    try {
      const offset = (page - 1) * limit;
      const response = await fetch(
        `${url}/sale/tenant/all?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );
      const json = await response.json();
      const payload = (json as { data?: unknown }).data ?? json;
      const normalized = payload as { data?: SaleListItem[]; total?: number };
      const results = normalized.data ?? [];
      return {
        results,
        total: normalized.total ?? results.length,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error al obtener historial de ventas",
      );
    }
  },

  async getSaleItems(saleId: string): Promise<SaleItemDetail[]> {
    try {
      const response = await fetch(`${url}/items/${saleId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) return [];
      const json: ApiResponse<SaleItemDetail[]> = await response.json();
      return json.data ?? [];
    } catch {
      return [];
    }
  },

  async getInvoice(saleId: string): Promise<InvoiceInfo | null> {
    try {
      const response = await fetch(`${url}/invoice/sale/${saleId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) return null;
      const json: ApiResponse<InvoiceInfo> = await response.json();
      return json.data;
    } catch {
      return null;
    }
  },
};
