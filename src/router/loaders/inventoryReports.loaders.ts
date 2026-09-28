import { warehouseApi } from "@/api/warehouse.api";
import { authApi } from "@/api/auth.api";

import type { Warehouse } from "@/interfaces/entities/Warehouse.interface";

export interface ReportsPageLoaderData {
  warehouses: Warehouse[];
  tenantId: string | null;
}

const fetchReportsPageData = async (): Promise<ReportsPageLoaderData> => {
  const currentUser = await authApi.getCurrentUser();
  const tenantId = currentUser?.tenant?.tenant_id ?? null;

  const warehouses = await warehouseApi
    .listByTenant()
    .catch(() => [] as Warehouse[]);

  return { warehouses, tenantId };
};

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getReportsPageData = () => ({
  data: fetchReportsPageData(),
});
