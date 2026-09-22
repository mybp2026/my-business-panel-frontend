import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateOvertimePayload,
  HrOvertimeRecord,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const overtimeApi = {
  async create(data: CreateOvertimePayload): Promise<HrOvertimeRecord> {
    const response = await fetch(`${url}/overtime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al registrar el registro de horas");
    }
    const json: ApiResponse<HrOvertimeRecord> = await response.json();
    return json.data;
  },

  async listByEmployee(
    employeeId: string,
    from: string,
    to: string,
  ): Promise<HrOvertimeRecord[]> {
    const response = await fetch(
      `${url}/overtime/${employeeId}?from=${from}&to=${to}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al cargar los registros de horas");
    }
    const json: ApiResponse<HrOvertimeRecord[]> = await response.json();
    return json.data ?? [];
  },

  async accumulated(employeeId: string, date: string) {
    const response = await fetch(
      `${url}/overtime/accumulated/${employeeId}?date=${date}&explain=true`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al calcular el acumulado de horas");
    }
    const json: ApiResponse<{
      daily: {
        used: number;
        max: number;
        ordinaryHours: number;
        extraHours: number;
      };
      weekly: { used: number; max: number };
      yearly: { used: number; max: number };
    }> = await response.json();
    return json.data;
  },
};
