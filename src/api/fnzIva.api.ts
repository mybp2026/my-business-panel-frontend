import api from "./api";
import type { IvaSummary } from "@/interfaces/entities/FnzIva.interface";

export const fnzIvaApi = {
  async getSummary(
    tenantId: string,
    start: string,
    end: string,
  ): Promise<IvaSummary> {
    const res = await api.get<IvaSummary>(`/iva/summary/${tenantId}`, {
      params: { start, end },
    });
    return res.data;
  },
};
