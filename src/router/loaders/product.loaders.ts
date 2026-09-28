import { productApi } from "@/api/product.api";
import { authApi } from "@/api/auth.api";
import { tenantApi } from "@/api/tenant.api";

import type { Product } from "@/interfaces/entities/Product.interface";
import type { ProductsListResponse } from "@/interfaces/api/responses/ProductsListResponse.interface";
import type { Tenant } from "@/interfaces/entities/Tenant.interface";

export interface ProductsPageLoaderData {
  initialProducts: ProductsListResponse;
  tenants: Tenant[];
}

const fetchProductsPageData = async (): Promise<ProductsPageLoaderData> => {
  const currentUser = await authApi.getCurrentUser();
  const isSuperAdmin = currentUser?.role?.role_hierarchy === 1;

  const initialProducts = isSuperAdmin
    ? await productApi.listAll(1, 100)
    : currentUser?.tenant?.tenant_id
      ? await productApi.listByTenant(currentUser.tenant.tenant_id, 1, 100)
      : { products: [], total: 0, page: 1, limit: 100 };

  const tenants = isSuperAdmin ? (await tenantApi.getAll()).tenants : [];

  return { initialProducts, tenants };
};

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getProductsPageData = () => ({
  data: fetchProductsPageData(),
});

export const getAllProducts = async (
  page = 1,
  limit = 100,
): Promise<ProductsListResponse> => productApi.listAll(page, limit);

export const getProductsByTenant = async (
  tenantId: string,
  page = 1,
  limit = 100,
): Promise<ProductsListResponse> =>
  productApi.listByTenant(tenantId, page, limit);

export const getProductById = async (productId: string): Promise<Product> =>
  productApi.getById(productId);

export const searchProducts = async (
  tenantId: string,
  query: string,
  page = 1,
  limit = 100,
): Promise<ProductsListResponse> =>
  productApi.search(tenantId, query, page, limit);

export const getProductsByCategory = async (
  tenantId: string,
  categoryId: string,
  page = 1,
  limit = 100,
): Promise<ProductsListResponse> =>
  productApi.filterByCategory(tenantId, categoryId, page, limit);
