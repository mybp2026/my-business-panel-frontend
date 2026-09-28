import { userApi } from "@/api/user.api";
import { authApi } from "@/api/auth.api";
import { withAuthCheck } from "./utils/withAuthCheck";

import type { User } from "@/interfaces/entities/User.interface";
import type { Role } from "@/interfaces/entities/Role.interface";
import type { UsersListResponse } from "@/interfaces/api/responses/UsersListResponse.interface";

export type UsersPageLoaderData = {
  initialUsers: UsersListResponse;
};

const fetchUsersPageData = async (): Promise<UsersPageLoaderData> =>
  withAuthCheck(async () => {
    const currentUser = await authApi.getCurrentUser();
    const tenantId = currentUser?.tenant?.tenant_id;
    const initialUsers = tenantId
      ? await userApi.listByTenant(tenantId)
      : { users: [], total: 0, page: 1, limit: 20 };

    return { initialUsers };
  });

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getUsersPageData = () => ({
  data: fetchUsersPageData(),
});

export const getUsers = async (
  tenantId?: string,
  page = 1,
  limit = 20,
): Promise<UsersListResponse> => userApi.list(tenantId, page, limit);

export const getUsersByTenant = async (
  tenantId: string,
  page = 1,
  limit = 20,
): Promise<UsersListResponse> => userApi.listByTenant(tenantId, page, limit);

export const getUserById = async (
  userId: string,
  full?: boolean,
): Promise<User> => userApi.getById(userId, full);

export const getRoles = async (): Promise<Role[]> => userApi.getRoles();

export const searchUsers = async (
  query: string,
  tenantId?: string,
  page = 1,
  limit = 20,
): Promise<UsersListResponse> => userApi.search(query, tenantId, page, limit);
