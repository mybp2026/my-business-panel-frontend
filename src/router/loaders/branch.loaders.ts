import { branchApi } from "@/api/branch.api";
import { authApi } from "@/api/auth.api";
import { tenantApi } from "@/api/tenant.api";
import { withAuthCheck } from "./utils/withAuthCheck";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { BranchListResponse } from "@/interfaces/api/responses/BranchListResponse.interface";
import type { Tenant } from "@/interfaces/entities/Tenant.interface";

export interface BranchesPageLoaderData {
  initialBranches: BranchListResponse;
  tenants: Tenant[];
}

const fetchBranchesPageData = async (): Promise<BranchesPageLoaderData> =>
  withAuthCheck(async () => {
    const currentUser = await authApi.getCurrentUser();
    const isSuperAdmin = currentUser?.role?.role_hierarchy === 1;

    const initialBranches = isSuperAdmin
      ? await branchApi.list(1, 100)
      : currentUser?.tenant?.tenant_id
        ? await branchApi.listByTenant(currentUser.tenant.tenant_id, 1, 100)
        : { branches: [], total: 0, page: 1, limit: 100 };

    const tenants = isSuperAdmin ? (await tenantApi.getAll()).tenants : [];

    return { initialBranches, tenants };
  });

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getBranchesPageData = () => ({
  data: fetchBranchesPageData(),
});

export const getBranches = async (
  page = 1,
  limit = 100,
): Promise<BranchListResponse> => branchApi.list(page, limit);

export const getBranchesByTenant = async (
  tenantId: string,
  page = 1,
  limit = 100,
): Promise<BranchListResponse> => branchApi.listByTenant(tenantId, page, limit);

export const getBranchById = async (branchId: string): Promise<Branch> =>
  branchApi.getById(branchId);
