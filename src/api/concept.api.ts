import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateHrConceptPayload,
  HrPayrollConcept,
  UpdateHrConceptPayload,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const conceptApi = {
  async listByTenant(tenantId: string): Promise<HrPayrollConcept[]> {
    const response = await fetch(`${url}/concept/${tenantId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      await buildError(response, "Error al cargar conceptos");
    }

    const json: ApiResponse<HrPayrollConcept[]> = await response.json();
    return json.data ?? [];
  },

  async create(data: CreateHrConceptPayload): Promise<{ conceptId: number }> {
    const response = await fetch(`${url}/concept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await buildError(response, "Error al crear concepto");
    }

    const json: ApiResponse<{ conceptId: number }> = await response.json();
    return json.data;
  },

  async update(
    conceptId: number,
    data: UpdateHrConceptPayload,
  ): Promise<{ concept: HrPayrollConcept }> {
    const response = await fetch(`${url}/concept/${conceptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await buildError(response, "Error al actualizar concepto");
    }

    const json: ApiResponse<{ concept: HrPayrollConcept }> =
      await response.json();
    return json.data;
  },

  async provisionDefaults(): Promise<{ message: string; created: number }> {
    const response = await fetch(`${url}/concept/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      await buildError(response, "Error al cargar conceptos predeterminados");
    }

    const json: ApiResponse<{ message: string; created: number }> =
      await response.json();
    return json.data;
  },

  async reactivate(conceptId: number): Promise<void> {
    const response = await fetch(`${url}/concept/${conceptId}/reactivate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      await buildError(response, "Error al reactivar concepto");
    }
  },

  async softDelete(conceptId: number): Promise<void> {
    const response = await fetch(`${url}/concept/${conceptId}/soft-delete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      await buildError(response, "Error al desactivar concepto");
    }
  },

  async delete(conceptId: number): Promise<void> {
    const response = await fetch(`${url}/concept/${conceptId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      await buildError(response, "Error al eliminar concepto");
    }
  },
};
