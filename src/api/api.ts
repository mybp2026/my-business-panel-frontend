import axios, { type AxiosRequestConfig } from "axios";
import { UnauthorizedError } from "./errors/UnauthorizedError";
import { refreshSession } from "./refreshSession";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1",
  withCredentials: true, // JWT llega como httpOnly cookie
  headers: {
    "Content-Type": "application/json",
  },
});

interface RetriableConfig extends AxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

// Response interceptor: normaliza errores y reintenta una vez tras refrescar sesión
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthEndpoint =
      typeof config?.url === "string" && config.url.includes("/auth/");

    if (
      error.response?.status === 401 &&
      config &&
      !config._retriedAfterRefresh &&
      !isAuthEndpoint
    ) {
      config._retriedAfterRefresh = true;
      const refreshed = await refreshSession();
      if (refreshed) return api(config);
      return Promise.reject(new UnauthorizedError("Sesión expirada"));
    }

    if (error.response?.status === 401) {
      return Promise.reject(new UnauthorizedError("Sesión expirada"));
    }

    const message: string =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "Error inesperado";
    return Promise.reject(new Error(message));
  },
);

export default api;
