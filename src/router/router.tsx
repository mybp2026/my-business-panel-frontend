import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useNavigation,
} from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { ModuleProvider } from "@/context/ModuleContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { publicRoutes } from "./public/routes";
import { privateRoutes } from "./private/routes";

/**
 * Layout raíz común a rutas públicas y privadas.
 * Provee los contextos de la app y muestra una barra de progreso
 * mientras el Data Router resuelve loaders durante la navegación.
 */
function RootLayout() {
  const navigation = useNavigation();

  return (
    <AuthProvider>
      <OnboardingProvider>
        <ModuleProvider>
          <CurrencyProvider>
            {/* Barra de carga global: visible en cualquier ruta con loader activo */}
            {navigation.state === "loading" && (
              <div className="fixed top-0 inset-x-0 h-0.5 bg-accent-600 z-100 animate-pulse" />
            )}
            <Outlet />
          </CurrencyProvider>
        </ModuleProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      ...publicRoutes,
      ...privateRoutes,
      { path: "*", element: <Navigate to="/auth/login" replace /> },
    ],
  },
]);
