import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  ApplyDeductionPaymentPayload,
  CreateDeductionPayload,
  HrEmployeeDeduction,
  UpdateDeductionPayload,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const hrDeductionsApi = {
  async create(data: CreateDeductionPayload): Promise<HrEmployeeDeduction> {
    const response = await fetch(`${url}/deductions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) await buildError(response, "Error al crear la deducción");
    const json: ApiResponse<HrEmployeeDeduction> = await response.json();
    return json.data;
  },

  async availableMargin(employeeId: string, date: string) {
    const response = await fetch(
      `${url}/deductions/${employeeId}/available-margin?date=${date}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al calcular el margen disponible");
    }
    const json: ApiResponse<{ margin: string; article: string }> =
      await response.json();
    return json.data;
  },

  async listByEmployee(employeeId: string): Promise<HrEmployeeDeduction[]> {
    const response = await fetch(`${url}/deductions/${employeeId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      await buildError(response, "Error al cargar las deducciones");
    }
    const json: ApiResponse<HrEmployeeDeduction[]> = await response.json();
    return json.data ?? [];
  },

  async update(
    deductionId: string,
    data: UpdateDeductionPayload,
  ): Promise<HrEmployeeDeduction> {
    const response = await fetch(`${url}/deductions/${deductionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al actualizar la deducción");
    }
    const json: ApiResponse<HrEmployeeDeduction> = await response.json();
    return json.data;
  },

  async apply(
    deductionId: string,
    data: ApplyDeductionPaymentPayload,
  ): Promise<HrEmployeeDeduction> {
    const response = await fetch(`${url}/deductions/${deductionId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al aplicar el pago de la deducción");
    }
    const json: ApiResponse<HrEmployeeDeduction> = await response.json();
    return json.data;
  },
};
