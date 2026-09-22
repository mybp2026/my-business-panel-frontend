import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateBeneficiaryPayload,
  DistributeSettlementPayload,
  HrClaimWindow,
  HrDistributionResult,
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

  async claimWindow(employeeId: string): Promise<HrClaimWindow> {
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
    const json: ApiResponse<HrClaimWindow> = await response.json();
    return json.data;
  },

  async distribute(
    employeeId: string,
    data: DistributeSettlementPayload,
  ): Promise<HrDistributionResult> {
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
    const json: ApiResponse<HrDistributionResult> = await response.json();
    return json.data;
  },

  /** `onlyValidated` se resuelve en la query del backend, no en memoria. */
  async list(
    employeeId: string,
    onlyValidated?: boolean,
  ): Promise<HrEmployeeBeneficiary[]> {
    const query =
      onlyValidated === undefined ? "" : `?onlyValidated=${onlyValidated}`;
    const response = await fetch(`${url}/beneficiaries/${employeeId}${query}`, {
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
