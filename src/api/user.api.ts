import { url } from ".";
import { authApi } from "./auth.api";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type { CreateUserRequest } from "@/interfaces/api/requests/CreateUserRequest.interface";
import type { UpdateUserRequest } from "@/interfaces/api/requests/UpdateUserRequest.interface";
import type { User } from "@/interfaces/entities/User.interface";
import type { Role } from "@/interfaces/entities/Role.interface";
import type { UsersListResponse } from "@/interfaces/api/responses/UsersListResponse.interface";
import type { CreateUserResponse } from "@/interfaces/api/responses/CreateUserResponse.interface";

const toUsersListResponse = (
  data: UsersListResponse | User[],
  page: number,
  limit: number,
): UsersListResponse => {
  if (Array.isArray(data)) {
    return {
      users: data,
      total: data.length,
      page,
      limit,
    };
  }

  const users = Array.isArray(data?.users) ? data.users : [];
  return {
    users,
    total: typeof data?.total === "number" ? data.total : users.length,
    page: typeof data?.page === "number" ? data.page : page,
    limit: typeof data?.limit === "number" ? data.limit : limit,
  };
};

export const userApi = {
  async create(data: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await fetch(`${url}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const json = await response.json();

    if (!response.ok) {
      const message = json?.message ?? json?.error ?? "Error al crear usuario";
      throw new Error(Array.isArray(message) ? message.join(", ") : message);
    }

    return (json as ApiResponse<CreateUserResponse>).data;
  },

  async list(tenantId?: string, page = 1, limit = 20): Promise<UsersListResponse> {
    try {
      if (tenantId) return this.listByTenant(tenantId, page, limit);

      const currentUser = await authApi.getCurrentUser();
      const currentTenantId = currentUser?.tenant?.tenant_id;

      if (!currentTenantId) {
        return { users: [], total: 0, page, limit };
      }

      return this.listByTenant(currentTenantId, page, limit);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error al listar usuarios del tenant",
      );
    }
  },

  async listByTenant(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<UsersListResponse> {
    try {
      const response = await fetch(
        `${url}/tenant/${tenantId}/users?page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      const json: ApiResponse<UsersListResponse | User[]> = await response.json();
      return toUsersListResponse(json.data, page, limit);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error al listar usuarios del tenant",
      );
    }
  },

  async getById(userId: string, full?: boolean): Promise<User> {
    try {
      const qs = full ? "?full=true" : "";
      const response = await fetch(`${url}/user/${userId}${qs}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const json: ApiResponse<User> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al obtener usuario",
      );
    }
  },

  async getByEmail(email: string): Promise<User> {
    try {
      const response = await fetch(`${url}/user/${email}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const json: ApiResponse<User> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al obtener usuario",
      );
    }
  },

  async update(userId: string, data: UpdateUserRequest): Promise<User> {
    try {
      const response = await fetch(`${url}/user/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const json: ApiResponse<User> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al actualizar usuario",
      );
    }
  },

  /** Solo admin: restablece la clave de un empleado de su tenant. */
  async resetEmployeePassword(
    userId: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const response = await fetch(`${url}/user/${userId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ new_password: newPassword }),
    });

    const json = await response.json();

    if (!response.ok) {
      const message =
        json?.message ?? json?.error ?? "Error al cambiar la contraseña";
      throw new Error(Array.isArray(message) ? message.join(", ") : message);
    }

    return (json as ApiResponse<{ message: string }>).data;
  },

  async delete(userId: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${url}/user/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const json: ApiResponse<{ message: string }> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al eliminar usuario",
      );
    }
  },

  async checkEmailAvailability(
    email: string,
    excludeId?: string,
  ): Promise<{ exists: boolean }> {
    const search = new URLSearchParams({ email });
    if (excludeId) search.set("exclude_id", excludeId);

    const response = await fetch(
      `${url}/user/availability?${search.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    if (!response.ok) return { exists: false };

    const json: ApiResponse<{ exists: boolean }> = await response.json();
    return json.data ?? { exists: false };
  },

  async getRoles(): Promise<Role[]> {
    try {
      const response = await fetch(`${url}/user/roles`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const json: ApiResponse<Role[]> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al obtener roles",
      );
    }
  },

  async search(
    query: string,
    tenantId?: string,
    page = 1,
    limit = 20,
  ): Promise<UsersListResponse> {
    try {
      const baseResult = await this.list(tenantId, page, limit);
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery) return baseResult;

      const filteredUsers = baseResult.users.filter((user) =>
        user.email.toLowerCase().includes(normalizedQuery),
      );

      return {
        users: filteredUsers,
        total: filteredUsers.length,
        page,
        limit: baseResult.limit,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al buscar usuarios",
      );
    }
  },
};
