import { warehouseApi } from "@/api/warehouse.api";
import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { withAuthCheck } from "./utils/withAuthCheck";

import type { Warehouse } from "@/interfaces/entities/Warehouse.interface";
import type { Branch } from "@/interfaces/entities/Branch.interface";

export interface WarehousesPageLoaderData {
  warehouses: Warehouse[];
  branches: Branch[];
  tenantId: string | null;
}

const fetchWarehousesPageData = async (): Promise<WarehousesPageLoaderData> =>
  withAuthCheck(async () => {
    const currentUser = await authApi.getCurrentUser();
    const tenantId = currentUser?.tenant?.tenant_id ?? null;

    const [warehouses, branchesResponse] = await Promise.all([
      warehouseApi.listByTenant().catch(() => [] as Warehouse[]),
      tenantId
        ? branchApi.listByTenant(tenantId, 1, 200)
        : Promise.resolve({ branches: [], total: 0, page: 1, limit: 0 }),
    ]);

    return {
      warehouses,
      branches: branchesResponse.branches ?? [],
      tenantId,
    };
  });

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getWarehousesPageData = () => ({
  data: fetchWarehousesPageData(),
});
