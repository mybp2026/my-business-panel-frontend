import { authApi } from "@/api/auth.api";
import { customerApi } from "@/api/customer.api";
import { returnsApi, type ReturnsFilters } from "@/api/returns.api";

import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { CurrentUserResponse } from "@/interfaces/api/responses/CurrentUserResponse.interface";
import type { ReturnTransaction } from "@/interfaces/entities/ReturnTransaction.interface";

export interface RefundsPageLoaderData {
  currentUser: CurrentUserResponse | null;
  initialReturns: ReturnTransaction[];
  initialCustomers: Customer[];
}

const fetchRefundsPageData = async (): Promise<RefundsPageLoaderData> => {
  const currentUser = await authApi.getCurrentUser();
  const tenantId = currentUser?.tenant?.tenant_id;

  const [initialReturns, customersRes] = await Promise.all([
    returnsApi.list({}).catch(() => []),
    tenantId
      ? customerApi.listByTenant(tenantId, 1, 100)
      : Promise.resolve({ customers: [], total: 0, page: 1, limit: 100 }),
  ]);

  return {
    currentUser,
    initialReturns,
    initialCustomers: customersRes.customers ?? [],
  };
};

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getRefundsPageData = () => ({
  data: fetchRefundsPageData(),
});

export const findReturns = async (
  filters: ReturnsFilters = {},
): Promise<ReturnTransaction[]> => returnsApi.list(filters);
