import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateHrPayrollParameterPayload,
  HrPayrollParameter,
  HrPayrollParametersMissing,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const hrParametersApi = {
  async listByTenant(): Promise<HrPayrollParameter[]> {
    const response = await fetch(`${url}/payroll-parameters`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      await buildError(response, "Error al cargar los parámetros de nómina");
    }

    const json: ApiResponse<HrPayrollParameter[]> = await response.json();
    return json.data ?? [];
  },

  async listMissing(date: string): Promise<HrPayrollParametersMissing> {
    const response = await fetch(
      `${url}/payroll-parameters/missing?date=${date}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    if (!response.ok) {
      await buildError(response, "Error al verificar parámetros faltantes");
    }

    const json: ApiResponse<HrPayrollParametersMissing> =
      await response.json();
    return json.data;
  },

  async create(
    data: CreateHrPayrollParameterPayload,
  ): Promise<HrPayrollParameter> {
    const response = await fetch(`${url}/payroll-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await buildError(response, "Error al guardar el parámetro");
    }

    const json: ApiResponse<HrPayrollParameter> = await response.json();
    return json.data;
  },
};
