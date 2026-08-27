import api from "./api";
import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  LoyaltyInterval,
  LoyaltyOverview,
} from "@/interfaces/entities/LoyaltyFinance.interface";

export const loyaltyFinanceApi = {
  // Resumen del pasivo de puntos del tenant. Intervalo y sucursal se aplican en el
  // backend (regla del repo: los filtros re-consultan, no se filtra en memoria).
  // branchId solo afecta el grafico de crecimiento (los saldos son a nivel tenant).
  async getOverview(
    interval: LoyaltyInterval,
    branchId?: string | null,
  ): Promise<LoyaltyOverview> {
    const response = await api.get<ApiResponse<LoyaltyOverview>>(
      "/finances/loyalty/overview",
      { params: { interval, ...(branchId ? { branchId } : {}) } },
    );
    return response.data.data;
  },
};
