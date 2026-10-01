import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type { Warehouse } from "@/interfaces/entities/Warehouse.interface";
import type {
  AggregatedInventoryItem,
  InventoryItem,
} from "@/interfaces/entities/InventoryItem.interface";
import type { InventoryTransfer } from "@/interfaces/entities/InventoryTransfer.interface";
import type { InventoryTransferDetail, InventoryTransferRequestDetail } from "@/interfaces/entities/InventoryTransferDetail.interface";
import type { DiscrepancyReport } from "@/interfaces/entities/DiscrepancyReport.interface";
import type { CreateWarehouseRequest } from "@/interfaces/api/requests/CreateWarehouseRequest.interface";
import type { UpdateWarehouseRequest } from "@/interfaces/api/requests/UpdateWarehouseRequest.interface";
import type { BulkInsertInventoryRequest } from "@/interfaces/api/requests/BulkInsertInventoryRequest.interface";
import type { CreateDiscrepancyReportRequest } from "@/interfaces/api/requests/CreateDiscrepancyReportRequest.interface";
import type { CreateInventoryTransferRequest } from "@/interfaces/api/requests/CreateInventoryTransferRequest.interface";
import type { UpdateInventoryItemRequest } from "@/interfaces/api/requests/UpdateInventoryItemRequest.interface";

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  const body = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? body?.error ?? fallback);
    throw new Error(msg);
  }
  return (body as ApiResponse<T>).data;
};

export const warehouseApi = {
  async listByTenant(): Promise<Warehouse[]> {
    const res = await fetch(`${url}/warehouse/tenant`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return json<Warehouse[]>(res, "Error al listar almacenes");
  },

  async create(data: CreateWarehouseRequest): Promise<Warehouse> {
    const res = await fetch(`${url}/warehouse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return json<Warehouse>(res, "Error al crear almacén");
  },

  async update(
    warehouseId: string,
    data: UpdateWarehouseRequest,
  ): Promise<Warehouse> {
    const res = await fetch(`${url}/warehouse/${warehouseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return json<Warehouse>(res, "Error al actualizar almacén");
  },

  async delete(warehouseId: string): Promise<{ message: string }> {
    const res = await fetch(`${url}/warehouse/${warehouseId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return json<{ message: string }>(res, "Error al eliminar almacén");
  },

  async listInventory(
    warehouseId: string,
    search?: string,
    groupId?: string,
    includeCatalog?: boolean,
  ): Promise<InventoryItem[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (groupId) params.set("group_id", groupId);
    if (includeCatalog) params.set("include_catalog", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${url}/warehouse/inventory/${warehouseId}${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return json<InventoryItem[]>(res, "Error al listar inventario");
  },

  async listInventoryAggregated(
    warehouseId: string,
    search?: string,
  ): Promise<AggregatedInventoryItem[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(
      `${url}/warehouse/inventory/${warehouseId}/aggregated${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    return json<AggregatedInventoryItem[]>(
      res,
      "Error al listar inventario agregado",
    );
  },

  async updateInventoryItem(
    inventoryId: string,
    data: UpdateInventoryItemRequest,
  ): Promise<InventoryItem> {
    const res = await fetch(`${url}/warehouse/inventory/${inventoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return json<InventoryItem>(
      res,
      "Error al actualizar registro de inventario",
    );
  },

  async deleteInventoryItem(inventoryId: string): Promise<{ message: string }> {
    const res = await fetch(`${url}/warehouse/inventory/${inventoryId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return json<{ message: string }>(
      res,
      "Error al eliminar registro de inventario",
    );
  },

  async bulkInsertInventory(
    data: BulkInsertInventoryRequest,
  ): Promise<{ inserted: number }> {
    const res = await fetch(`${url}/warehouse/inventory/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return json<{ inserted: number }>(res, "Error al agregar inventario");
  },

  async createDiscrepancyReport(
    data: CreateDiscrepancyReportRequest,
  ): Promise<DiscrepancyReport> {
    const res = await fetch(`${url}/warehouse/discrepancy-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return json<DiscrepancyReport>(
      res,
      "Error al crear reporte de discrepancia",
    );
  },

  async listDiscrepancyReports(
    warehouseId: string,
  ): Promise<DiscrepancyReport[]> {
    const res = await fetch(
      `${url}/warehouse/discrepancy-report/${warehouseId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    return json<DiscrepancyReport[]>(
      res,
      "Error al listar reportes de discrepancia",
    );
  },

  async listTransfers(): Promise<InventoryTransfer[]> {
    const res = await fetch(`${url}/warehouse/transfer`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return json<InventoryTransfer[]>(res, "Error al listar transferencias");
  },

  async createTransfer(
    data: CreateInventoryTransferRequest,
  ): Promise<{ message: string; inventory_transfer_id: string }> {
    const res = await fetch(`${url}/warehouse/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return json<{ message: string; inventory_transfer_id: string }>(
      res,
      "Error al crear transferencia",
    );
  },
  async listNegativeStockProducts(
    warehouseId: string,
  ): Promise<AggregatedInventoryItem[]> {
    const all = await warehouseApi.listInventoryAggregated(warehouseId);
    return all.filter((item) => item.stock < 0);
  },

  async disaggregateLote(
    warehouse_id: string,
    product_variant_id: string,
    amount: number,
  ): Promise<{ message: string }> {
    const res = await fetch(`${url}/warehouse/disaggregate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ warehouse_id, product_variant_id, amount }),
    });
    return json<{ message: string }>(res, "Error al desagrupar lote");
  },

  async getTransferDetail(transferId: string): Promise<InventoryTransferDetail> {
    const res = await fetch(`${url}/warehouse/transfer/${transferId}`, {
      credentials: "include",
    });
    return json<InventoryTransferDetail>(
      res,
      "Error al obtener detalle de transferencia",
    );
  },

  async getTransferRequestDetail(
    requestId: string,
  ): Promise<InventoryTransferRequestDetail> {
    const res = await fetch(
      `${url}/warehouse/transfer-request/${requestId}`,
      { credentials: "include" },
    );
    return json<InventoryTransferRequestDetail>(
      res,
      "Error al obtener detalle de solicitud",
    );
  },

  async listTransferRequests(): Promise<any[]> {
    const res = await fetch(`${url}/warehouse/transfer-request`, {
      credentials: "include",
    });
    return json<any[]>(res, "Error al obtener solicitudes de transferencia");
  },

  async updateTransferRequestStatus(
    requestId: string,
    status: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<{ message: string }> {
    const res = await fetch(
      `${url}/warehouse/transfer-request/${requestId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status,
          rejection_reason: rejectionReason || null,
        }),
      },
    );
    return json<{ message: string }>(res, "Error al actualizar solicitud");
  },
};
