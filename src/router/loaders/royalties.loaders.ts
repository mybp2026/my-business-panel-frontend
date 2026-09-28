import { authApi } from "@/api/auth.api";
import { productGroupApi, productGroupTypeApi } from "@/api/productGroup.api";
import { royaltyApi } from "@/api/royalty.api";
import type {
  TenantProductGroup,
  TenantProductGroupType,
} from "@/interfaces/entities/ProductGroup.interface";
import type { RoyaltyRule } from "@/interfaces/entities/Royalty.interface";

export interface RoyaltiesPageLoaderData {
  rules: RoyaltyRule[];
  productGroups: TenantProductGroup[];
  productGroupTypes: TenantProductGroupType[];
  tenantId: string;
}

const fetchRoyaltiesPageData = async (): Promise<RoyaltiesPageLoaderData> => {
  const user = await authApi.getCurrentUser();
  const tenantId = user?.tenant?.tenant_id ?? "";

  const [rules, productGroups, productGroupTypes] = await Promise.all([
    tenantId ? royaltyApi.listRules(tenantId) : Promise.resolve([]),
    tenantId ? productGroupApi.listByTenant(tenantId) : Promise.resolve([]),
    tenantId ? productGroupTypeApi.listByTenant(tenantId) : Promise.resolve([]),
  ]);

  return { rules, productGroups, productGroupTypes, tenantId };
};

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getRoyaltiesPageData = () => ({
  data: fetchRoyaltiesPageData(),
});
