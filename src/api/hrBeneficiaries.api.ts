import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateBeneficiaryPayload,
  DistributeSettlementPayload,
  HrEmployeeBeneficiary,
} from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const hrBeneficiariesApi = {
  async create(
    data: CreateBeneficiaryPayload,
  ): Promise<HrEmployeeBeneficiary> {
    const response = await fetch(`${url}/beneficiaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al registrar el beneficiario");
    }
    const json: ApiResponse<HrEmployeeBeneficiary> = await response.json();
    return json.data;
  },

  async validate(
    beneficiaryId: string,
    validatedAt: string,
  ): Promise<HrEmployeeBeneficiary> {
    const response = await fetch(
      `${url}/beneficiaries/${beneficiaryId}/validate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ validated_at: validatedAt }),
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al validar el beneficiario");
    }
    const json: ApiResponse<HrEmployeeBeneficiary> = await response.json();
    return json.data;
  },

  async claimWindow(employeeId: string) {
    const response = await fetch(
      `${url}/beneficiaries/${employeeId}/claim-window`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al calcular la ventana de reclamo");
    }
    const json: ApiResponse<{
      opensAt: string;
      closesAt: string;
      article: string;
    }> = await response.json();
    return json.data;
  },

  async distribute(
    employeeId: string,
    data: DistributeSettlementPayload,
  ): Promise<HrEmployeeBeneficiary[]> {
    const response = await fetch(
      `${url}/beneficiaries/${employeeId}/distribute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      await buildError(response, "Error al distribuir la liquidación");
    }
    const json: ApiResponse<HrEmployeeBeneficiary[]> = await response.json();
    return json.data ?? [];
  },

  async list(employeeId: string): Promise<HrEmployeeBeneficiary[]> {
    const response = await fetch(`${url}/beneficiaries/${employeeId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      await buildError(response, "Error al cargar los beneficiarios");
    }
    const json: ApiResponse<HrEmployeeBeneficiary[]> = await response.json();
    return json.data ?? [];
  },
};
