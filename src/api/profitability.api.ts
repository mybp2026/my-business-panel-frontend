import api from "./api";
import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  ProfitabilityInterval,
  ProfitabilityRawData,
} from "@/interfaces/entities/Profitability.interface";

export const profitabilityApi = {
  // Datos crudos por sucursal y bucket. Intervalo y sucursal se aplican en el backend
  // (regla del repo: los filtros re-consultan, no se filtra en memoria).
  async getProfitability(
    interval: ProfitabilityInterval,
    branchId?: string | null,
  ): Promise<ProfitabilityRawData> {
    const response = await api.get<ApiResponse<ProfitabilityRawData>>(
      "/finances/profitability",
      { params: { interval, ...(branchId ? { branchId } : {}) } },
    );
    return response.data.data;
  },
};
