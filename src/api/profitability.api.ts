import api from "./api";
import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  ProfitabilityInterval,
  ProfitabilityRawData,
} from "@/interfaces/entities/Profitability.interface";

export const profitabilityApi = {
  // Datos crudos por sucursal y bucket. El filtro de intervalo se aplica en el backend.
  async getProfitability(
    interval: ProfitabilityInterval,
  ): Promise<ProfitabilityRawData> {
    const response = await api.get<ApiResponse<ProfitabilityRawData>>(
      "/finances/profitability",
      { params: { interval } },
    );
    return response.data.data;
  },
};
