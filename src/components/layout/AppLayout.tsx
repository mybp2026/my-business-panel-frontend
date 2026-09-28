import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { IconX } from "@/assets/icons";
import { useAuth } from "@/context/AuthContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { Button } from "@/components/ui/Button";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login", { replace: true });
  };

  const sidebarProps = {
    roleId: user?.role.role_id ?? 0,
    userEmail: user?.email ?? "",
    roleName: user?.role.role_name ?? "usuario",
    onLogout: handleLogout,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="hidden h-full shrink-0 flex-col border-r border-gray-300 bg-white lg:flex lg:w-64 xl:w-72">
        <SidebarContent {...sidebarProps} />
      </aside>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed left-0 top-0 z-40 h-full w-72 border-r border-gray-100 bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Button
          variant="ghost"
          size="sm"
          aria-label="close"
          onClick={() => setDrawerOpen(false)}
          className="absolute right-4 top-4 !p-1.5 !min-h-0 border-none text-gray-400 hover:text-gray-700"
        >
          <IconX />
        </Button>
        <SidebarContent
          {...sidebarProps}
          onNavClick={() => setDrawerOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader onMenuOpen={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
