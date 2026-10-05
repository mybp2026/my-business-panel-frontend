import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type { LoginRequest } from "@/interfaces/api/requests/LoginRequest.interface";
import type { ChangePasswordRequest } from "@/interfaces/api/requests/ChangePasswordRequest.interface";
import type { LoginResponse } from "@/interfaces/api/responses/LoginResponse.interface";
import type { CurrentUserResponse } from "@/interfaces/api/responses/CurrentUserResponse.interface";
import { UnauthorizedError } from "./errors/UnauthorizedError";
import { NetworkError } from "./errors/NetworkError";
import { refreshSession } from "./refreshSession";

export const HAS_SESSION_KEY = "has_session";

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${url}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const json: ApiResponse<LoginResponse> = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Error al iniciar sesión");
      }

      try {
        if (data.rememberMe) {
          localStorage.setItem(HAS_SESSION_KEY, "true");
        } else {
          localStorage.removeItem(HAS_SESSION_KEY);
        }
      } catch {
        // localStorage inaccesible (modo privado, etc): no bloquea el login
      }

      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al iniciar sesión",
      );
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${url}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al cerrar sesión",
      );
    } finally {
      try {
        localStorage.removeItem(HAS_SESSION_KEY);
      } catch {
        // localStorage inaccesible: nada que limpiar
      }
    }
  },

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const request = () =>
      fetch(`${url}/user`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

    let response: Response;
    try {
      response = await request();
      // El access token dura 15 min: al reabrir la app puede haber expirado
      // aunque el refresh token siga vigente. Se intenta renovar una vez.
      if (response.status === 401 && (await refreshSession())) {
        response = await request();
      }
    } catch {
      // fetch nunca llego a completarse (offline, backend caido): no es un
      // 401 real, no debe forzar cierre de sesion.
      throw new NetworkError();
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthorizedError("Sesión expirada");
      }
      throw new Error("Error al obtener el usuario");
    }

    const json: ApiResponse<CurrentUserResponse> = await response.json();
    return json.data;
  },

  async changePassword(
    data: ChangePasswordRequest,
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(`${url}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: data.currentPassword,
          new_password: data.newPassword,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        const message = json?.message ?? json?.error;
        throw new Error(
          (Array.isArray(message) ? message.join(", ") : message) ||
            "Error al cambiar contraseña",
        );
      }

      return (json as ApiResponse<{ message: string }>).data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al cambiar contraseña",
      );
    }
  },
};
