import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  ApproveSeveranceAdvancePayload,
  CreateSeveranceAdvancePayload,
  GenerateSeveranceDepositsPayload,
  GenerateSeveranceInterestPayload,
  HrSeveranceAdvance,
  HrSeveranceBalance,
  HrSeveranceDeposit,
  HrSeveranceInterest,
  RejectSeveranceAdvancePayload,
  SettleSeveranceInterestPayload,
  UpdateSeveranceDepositPayload,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

const getJson = async <T>(path: string, fallback: string): Promise<T> => {
  const response = await fetch(`${url}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) await buildError(response, fallback);
  const json: ApiResponse<T> = await response.json();
  return json.data;
};

const postJson = async <T>(
  path: string,
  body: unknown,
  fallback: string,
): Promise<T> => {
  const response = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) await buildError(response, fallback);
  const json: ApiResponse<T> = await response.json();
  return json.data;
};

export const hrSeveranceApi = {
  async calculate(employeeId: string, endDate: string) {
    return getJson(
      `/severance/calculate/${employeeId}?endDate=${endDate}`,
      "Error al calcular prestaciones sociales",
    );
  },

  async generateDeposits(
    data: GenerateSeveranceDepositsPayload,
  ): Promise<HrSeveranceDeposit[]> {
    const result = await postJson<HrSeveranceDeposit[]>(
      "/severance/deposits/generate",
      data,
      "Error al generar depósitos de garantía",
    );
    return result ?? [];
  },

  async listDeposits(employeeId: string): Promise<HrSeveranceDeposit[]> {
    const result = await getJson<HrSeveranceDeposit[]>(
      `/severance/deposits/${employeeId}`,
      "Error al cargar depósitos de garantía",
    );
    return result ?? [];
  },

  async updateDeposit(
    depositId: string,
    data: UpdateSeveranceDepositPayload,
  ): Promise<HrSeveranceDeposit> {
    const response = await fetch(`${url}/severance/deposits/${depositId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al actualizar el depósito");
    }
    const json: ApiResponse<HrSeveranceDeposit> = await response.json();
    return json.data;
  },

  async generateInterest(
    data: GenerateSeveranceInterestPayload,
  ): Promise<HrSeveranceInterest[]> {
    const result = await postJson<HrSeveranceInterest[]>(
      "/severance/interest/generate",
      data,
      "Error al generar intereses de garantía",
    );
    return result ?? [];
  },

  async settleInterest(data: SettleSeveranceInterestPayload) {
    return postJson(
      "/severance/interest/settle",
      data,
      "Error al liquidar intereses de garantía",
    );
  },

  async listInterest(employeeId: string): Promise<HrSeveranceInterest[]> {
    const result = await getJson<HrSeveranceInterest[]>(
      `/severance/interest/${employeeId}`,
      "Error al cargar intereses de garantía",
    );
    return result ?? [];
  },

  async availableAdvance(employeeId: string) {
    return getJson(
      `/severance/advances/${employeeId}/available`,
      "Error al calcular el anticipo disponible",
    );
  },

  async createAdvance(
    data: CreateSeveranceAdvancePayload,
  ): Promise<HrSeveranceAdvance> {
    return postJson(
      "/severance/advances",
      data,
      "Error al solicitar el anticipo",
    );
  },

  async approveAdvance(
    advanceId: string,
    data: ApproveSeveranceAdvancePayload,
  ): Promise<HrSeveranceAdvance> {
    return postJson(
      `/severance/advances/${advanceId}/approve`,
      data,
      "Error al aprobar el anticipo",
    );
  },

  async rejectAdvance(
    advanceId: string,
    data: RejectSeveranceAdvancePayload,
  ): Promise<HrSeveranceAdvance> {
    return postJson(
      `/severance/advances/${advanceId}/reject`,
      data,
      "Error al rechazar el anticipo",
    );
  },

  async listAdvances(employeeId: string): Promise<HrSeveranceAdvance[]> {
    const result = await getJson<HrSeveranceAdvance[]>(
      `/severance/advances/${employeeId}`,
      "Error al cargar anticipos",
    );
    return result ?? [];
  },

  async balance(employeeId: string): Promise<HrSeveranceBalance> {
    return getJson(
      `/severance/balance/${employeeId}`,
      "Error al calcular el saldo de garantía",
    );
  },
};
