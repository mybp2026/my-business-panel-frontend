import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateProfitPeriodPayload,
  HrProfitSharingDetail,
  HrProfitSharingPeriod,
  SetLiquidBenefitsPayload,
  YearEndBonusPayload,
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

export const hrProfitSharingApi = {
  async createPeriod(
    data: CreateProfitPeriodPayload,
  ): Promise<HrProfitSharingPeriod> {
    return postJson(
      "/profit-sharing/periods",
      data,
      "Error al crear el periodo de utilidades",
    );
  },

  async setLiquidBenefits(
    periodId: string,
    data: SetLiquidBenefitsPayload,
  ): Promise<HrProfitSharingPeriod> {
    return postJson(
      `/profit-sharing/periods/${periodId}/liquid-benefits`,
      data,
      "Error al registrar los beneficios líquidos",
    );
  },

  async calculate(periodId: string): Promise<HrProfitSharingDetail[]> {
    const result = await postJson<HrProfitSharingDetail[]>(
      `/profit-sharing/periods/${periodId}/calculate`,
      {},
      "Error al calcular el reparto de utilidades",
    );
    return result ?? [];
  },

  async close(periodId: string): Promise<HrProfitSharingPeriod> {
    return postJson(
      `/profit-sharing/periods/${periodId}/close`,
      {},
      "Error al cerrar el periodo de utilidades",
    );
  },

  async listDetails(periodId: string): Promise<HrProfitSharingDetail[]> {
    const result = await getJson<HrProfitSharingDetail[]>(
      `/profit-sharing/periods/${periodId}/details`,
      "Error al cargar el desglose de utilidades",
    );
    return result ?? [];
  },

  async getPeriod(periodId: string): Promise<HrProfitSharingPeriod> {
    return getJson(
      `/profit-sharing/periods/${periodId}`,
      "Error al cargar el periodo de utilidades",
    );
  },

  async fraction(employeeId: string, endDate: string) {
    return getJson(
      `/profit-sharing/fraction/${employeeId}?endDate=${endDate}`,
      "Error al calcular la fracción de utilidades",
    );
  },

  async yearEndBonusPreview(employeeId: string, year: number) {
    return getJson(
      `/profit-sharing/year-end-bonus/preview/${employeeId}?year=${year}`,
      "Error al calcular la bonificación de fin de año",
    );
  },

  async payYearEndBonus(data: YearEndBonusPayload) {
    return postJson(
      "/profit-sharing/year-end-bonus",
      data,
      "Error al pagar la bonificación de fin de año",
    );
  },

  async listYearEndBonus(fiscalYear: number) {
    const result = await getJson<unknown[]>(
      `/profit-sharing/year-end-bonus?fiscalYear=${fiscalYear}`,
      "Error al cargar bonificaciones de fin de año",
    );
    return result ?? [];
  },
};
