import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateCollectionRequest,
  UpsertCollectionAlertConfigRequest,
} from "@/interfaces/api/requests/AccountsReceivableRequests.interface";
import type {
  CollectionAlert,
  CollectionAlertConfigResponse,
  CollectionAlertStats,
  ReceivableCatalogs,
  SaleAccountReceivableListResponse,
  UpdatedSaleAccountReceivable,
} from "@/interfaces/entities/AccountReceivable.interface";

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) {
    const errorBody = body as any;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(", ")
      : (errorBody?.message ?? errorBody?.error ?? fallback);
    throw new Error(message);
  }

  return body.data as T;
};

const withQuery = (
  path: string,
  params?: Record<string, string | undefined | null>,
) => {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  return search.size ? `${path}?${search.toString()}` : path;
};

export const accountsReceivableApi = {
  async listReceivables(
    page = 1,
    limit = 50,
  ): Promise<SaleAccountReceivableListResponse> {
    const res = await fetch(
      `${url}${withQuery("/pos/receivables", {
        page: String(page),
        limit: String(limit),
      })}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<SaleAccountReceivableListResponse>(
      res,
      "Error al listar cuentas por cobrar",
    );
  },

  async getCatalogs(): Promise<ReceivableCatalogs> {
    const res = await fetch(`${url}/pos/receivables/catalogs`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<ReceivableCatalogs>(
      res,
      "Error al cargar catálogos de cuentas por cobrar",
    );
  },

  async registerCollection(
    data: CreateCollectionRequest,
  ): Promise<{
    collection_id: string;
    sale_account_receivable: UpdatedSaleAccountReceivable;
  }> {
    const res = await fetch(`${url}/pos/receivables/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<{
      collection_id: string;
      sale_account_receivable: UpdatedSaleAccountReceivable;
    }>(res, "Error al registrar el cobro");
  },

  async updateCollection(
    collectionId: string,
    data: Partial<CreateCollectionRequest>,
  ): Promise<{
    collection_id: string;
    sale_account_receivable: UpdatedSaleAccountReceivable;
  }> {
    const res = await fetch(
      `${url}/pos/receivables/collection/${collectionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      },
    );

    return json<{
      collection_id: string;
      sale_account_receivable: UpdatedSaleAccountReceivable;
    }>(res, "Error al actualizar el cobro");
  },

  async listCollectionAlerts(tenantId?: string): Promise<CollectionAlert[]> {
    const res = await fetch(
      withQuery(`${url}/pos/collection-alerts`, { tenantId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<CollectionAlert[]>(res, "Error al listar alertas de cobro");
  },

  async getCollectionAlertStats(
    tenantId?: string,
  ): Promise<CollectionAlertStats> {
    const res = await fetch(
      withQuery(`${url}/pos/collection-alerts/stats`, { tenantId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<CollectionAlertStats>(
      res,
      "Error al obtener estadísticas de alertas de cobro",
    );
  },

  async getCollectionAlertConfig(
    tenantId?: string,
  ): Promise<CollectionAlertConfigResponse> {
    const res = await fetch(
      withQuery(`${url}/pos/collection-alerts/config`, { tenantId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<CollectionAlertConfigResponse>(
      res,
      "Error al obtener la configuración de alertas de cobro",
    );
  },

  async saveCollectionAlertConfig(
    data: UpsertCollectionAlertConfigRequest,
  ): Promise<CollectionAlertConfigResponse> {
    const res = await fetch(`${url}/pos/collection-alerts/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<CollectionAlertConfigResponse>(
      res,
      "Error al guardar la configuración de alertas de cobro",
    );
  },

  async generateCollectionAlerts(tenantId?: string): Promise<{
    tenant_id: string;
    alerts: CollectionAlert[];
    stats: CollectionAlertStats;
  }> {
    const res = await fetch(
      withQuery(`${url}/pos/collection-alerts/generate`, { tenantId }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<{
      tenant_id: string;
      alerts: CollectionAlert[];
      stats: CollectionAlertStats;
    }>(res, "Error al generar alertas de cobro");
  },

  async resolveCollectionAlert(
    alertId: string,
  ): Promise<{ collection_alert_id: string; is_resolved: boolean }> {
    const res = await fetch(
      `${url}/pos/collection-alerts/${alertId}/resolve`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<{ collection_alert_id: string; is_resolved: boolean }>(
      res,
      "Error al resolver la alerta de cobro",
    );
  },
};
