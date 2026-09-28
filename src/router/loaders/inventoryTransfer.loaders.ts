import { authApi } from "@/api/auth.api";
import { warehouseApi } from "@/api/warehouse.api";

async function fetchMovementsPageData() {
  const currentUser = await authApi.getCurrentUser();
  const tenantId = currentUser?.tenant?.tenant_id ?? null;

  const [transfers, warehouses, requests] = await Promise.all([
    warehouseApi.listTransfers(),
    warehouseApi.listByTenant(),
    warehouseApi.listTransferRequests()
  ]);
  return { transfers, warehouses, requests, tenantId };
}

export type MovementsPageLoaderData = Awaited<ReturnType<typeof fetchMovementsPageData>>;

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export function getMovementsPageData() {
  return { data: fetchMovementsPageData() };
}

