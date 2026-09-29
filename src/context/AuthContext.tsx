/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { authApi, HAS_SESSION_KEY } from "../api/auth.api";
import { clockingApi } from "@/api/clocking.api";
import { employeeApi } from "@/api/employee.api";
import { UnauthorizedError } from "@/api/errors/UnauthorizedError";
import { NetworkError } from "@/api/errors/NetworkError";

function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(HAS_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}
import type { CurrentUserResponse } from "../interfaces/api/responses/CurrentUserResponse.interface";
import type { LoginRequest } from "../interfaces/api/requests/LoginRequest.interface";

interface AuthContextValue {
  user: CurrentUserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<CurrentUserResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const registerClockInForUser = async (userId: string) => {
  const employee = await employeeApi.getByUserId(userId);

  if (!employee) return;

  await clockingApi.clockIn({
    employeeId: employee.employee_id,
    branchId: employee.branch_id,
  });
};

const registerClockOutForUser = async (userId: string) => {
  const employee = await employeeApi.getByUserId(userId);

  if (!employee) return;

  await clockingApi.clockOut(employee.employee_id);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);

  // Actualizar la referencia cuando navigate cambie
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // Manejador centralizado para errores UnauthorizedError
  const handleUnauthorizedError = useCallback(() => {
    setUser(null);
    navigateRef.current("/auth/login", { replace: true });
  }, []);

  // Rehidrata la sesión desde la cookie al montar el provider
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        handleUnauthorizedError();
      } else if (error instanceof NetworkError) {
        // Falla de red/backend caido: mantener el estado actual, no desloguear
      } else {
        setUser(null);
      }
    }
  }, [handleUnauthorizedError]);

  useEffect(() => {
    // Sin "Recordarme" activo en un login previo, no hay refresh token que
    // valga la pena intentar: evita un 401 innecesario al abrir la app.
    if (!hasStoredSession()) {
      setIsLoading(false);
      return;
    }
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = async (data: LoginRequest) => {
    try {
      const session = await authApi.login(data);
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);

      void registerClockInForUser(session.user.user_id).catch((error) => {
        console.error("No se pudo registrar el clock in automático", error);
      });

      return currentUser;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        handleUnauthorizedError();
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user?.user_id) {
        await registerClockOutForUser(user.user_id).catch((error) => {
          console.error("No se pudo registrar el clock out automático", error);
        });
      }

      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
