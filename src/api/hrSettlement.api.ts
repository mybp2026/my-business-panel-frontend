import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateSettlementPayload,
  HrSettlement,
  HrSettlementPreview,
  PaySettlementPayload,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const hrSettlementApi = {
  async indemnityApplies(
    terminationType: string,
  ): Promise<{ terminationType: string; appliesIndemnity: boolean; article: string }> {
    const response = await fetch(
      `${url}/settlement/indemnity-applies?terminationType=${terminationType}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al verificar la indemnización");
    }
    const json: ApiResponse<{
      terminationType: string;
      appliesIndemnity: boolean;
      article: string;
    }> = await response.json();
    return json.data;
  },

  async preview(
    employeeId: string,
    endDate: string,
  ): Promise<HrSettlementPreview> {
    const response = await fetch(
      `${url}/settlement/preview/${employeeId}?endDate=${endDate}&breakdown=true`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al calcular la liquidación");
    }
    const json: ApiResponse<HrSettlementPreview> = await response.json();
    return json.data;
  },

  async overdue(): Promise<HrSettlement[]> {
    const response = await fetch(`${url}/settlement/overdue`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      await buildError(response, "Error al cargar liquidaciones vencidas");
    }
    const json: ApiResponse<HrSettlement[]> = await response.json();
    return json.data ?? [];
  },

  async create(data: CreateSettlementPayload): Promise<HrSettlement> {
    const response = await fetch(`${url}/settlement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al crear la liquidación");
    }
    const json: ApiResponse<HrSettlement> = await response.json();
    return json.data;
  },

  async pay(
    settlementId: string,
    data: PaySettlementPayload,
  ): Promise<HrSettlement> {
    const response = await fetch(`${url}/settlement/${settlementId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al pagar la liquidación");
    }
    const json: ApiResponse<HrSettlement> = await response.json();
    return json.data;
  },

  async voidSettlement(settlementId: string, reason?: string): Promise<HrSettlement> {
    const response = await fetch(`${url}/settlement/${settlementId}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      await buildError(response, "Error al anular la liquidación");
    }
    const json: ApiResponse<HrSettlement> = await response.json();
    return json.data;
  },

  async getById(settlementId: string): Promise<HrSettlement> {
    const response = await fetch(
      `${url}/settlement/${settlementId}?breakdown=true`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al cargar la liquidación");
    }
    const json: ApiResponse<HrSettlement> = await response.json();
    return json.data;
  },
};
