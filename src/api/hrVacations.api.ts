import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  EnjoyVacationPayload,
  HrVacationEntitlement,
  HrVacationPeriod,
  PayVacationBonusPayload,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const hrVacationsApi = {
  async entitlementByEmployee(
    employeeId: string,
    date?: string,
  ): Promise<HrVacationEntitlement> {
    const qs = new URLSearchParams({ includeBonus: "true" });
    if (date) qs.set("date", date);
    const response = await fetch(
      `${url}/vacations/entitlement/${employeeId}?${qs.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al calcular el derecho a vacaciones");
    }
    const json: ApiResponse<HrVacationEntitlement> = await response.json();
    return json.data;
  },

  async generatePeriods(
    employeeId: string,
    until: string,
  ): Promise<HrVacationPeriod[]> {
    const response = await fetch(`${url}/vacations/periods/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ employee_id: employeeId, until }),
    });
    if (!response.ok) {
      await buildError(response, "Error al generar periodos de vacaciones");
    }
    const json: ApiResponse<HrVacationPeriod[]> = await response.json();
    return json.data ?? [];
  },

  async listByEmployee(employeeId: string): Promise<HrVacationPeriod[]> {
    const response = await fetch(`${url}/vacations/periods/${employeeId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      await buildError(response, "Error al cargar periodos de vacaciones");
    }
    const json: ApiResponse<HrVacationPeriod[]> = await response.json();
    return json.data ?? [];
  },

  async enjoy(
    periodId: string,
    data: EnjoyVacationPayload,
  ): Promise<HrVacationPeriod> {
    const response = await fetch(`${url}/vacations/periods/${periodId}/enjoy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al registrar el disfrute");
    }
    const json: ApiResponse<HrVacationPeriod> = await response.json();
    return json.data;
  },

  async payBonus(
    periodId: string,
    data: PayVacationBonusPayload,
  ): Promise<HrVacationPeriod> {
    const response = await fetch(
      `${url}/vacations/periods/${periodId}/pay-bonus`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al pagar el bono vacacional");
    }
    const json: ApiResponse<HrVacationPeriod> = await response.json();
    return json.data;
  },

  async pendingValue(
    employeeId: string,
    endDate: string,
  ): Promise<{ totalPendingDays: string; amount: string }> {
    const response = await fetch(
      `${url}/vacations/pending-value/${employeeId}?endDate=${endDate}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al calcular el valor pendiente");
    }
    const json: ApiResponse<{ totalPendingDays: string; amount: string }> =
      await response.json();
    return json.data;
  },
};
