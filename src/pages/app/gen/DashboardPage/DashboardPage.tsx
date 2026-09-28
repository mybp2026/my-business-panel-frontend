import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

import { Badge, SubscriptionBadge } from "@/components/ui/Badge";
import { ModuleCard } from "@/components/ui/ModuleCard";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import {
  IconBriefcase,
  IconCreditCard,
  IconPackage,
  IconShoppingCart,
  IconUsers,
  IconMail,
  IconCalendar,
} from "@/assets/icons";

import {
  MODULES,
  isAllowedForRole,
  getFirstAllowedSubmodulePath,
  type Module,
} from "@/config/modules";

import { generalOptions } from "./general-options";
import { SuperuserDashboard } from "./SuperUserDashboard";
import { capitalize } from "@/utils/capitalize";

function getModuleIcon(icon: Module["icon"]): ReactNode {
  const map: Record<Module["icon"], ReactNode> = {
    "shopping-cart": <IconShoppingCart />,
    package: <IconPackage />,
    "file-text": <IconBriefcase />,
    users: <IconUsers />,
    briefcase: <IconBriefcase />,
    "credit-card": <IconCreditCard />,
  };
  return map[icon];
}

// ─── Tenant user Dashboard ────────────────────────────────────────────────────
export function TenantDashboard() {
  const { user } = useAuth();

  const roleId = user?.role.role_id ?? 1;
  const tenant = user?.tenant;

  const mainModules = Object.values(MODULES)
    .filter(
      (mod) =>
        mod.id !== "general" && isAllowedForRole(mod.rolesAllowed, roleId),
    )
    .map((mod) => ({
      label: mod.label,
      description: mod.description,
      icon: getModuleIcon(mod.icon),
      to: getFirstAllowedSubmodulePath(mod, roleId),
      code: mod.code,
      accentColor: mod.color,
    }));

  const createdAt = tenant?.created_at
    ? new Date(tenant.created_at).toLocaleDateString("es-CR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeaderBanner
        eyebrow="General"
        title="Dashboard"
        description="Resumen de información general de la cuenta y acceso rápido a los módulos principales."
      />

      {/* Company info card */}
      {tenant && (
        <div className="bg-white rounded-xl border border-gray-300 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl font-display">
              {tenant.tenant_name.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 font-display">
                {tenant.tenant_name}
              </h2>
              <SubscriptionBadge active={tenant.is_subscribed} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <IconMail />
                {tenant.contact_email}
              </span>
              <span className="flex items-center gap-1.5">
                <IconCalendar />
                Desde {createdAt}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <Badge variant="accent">
              {capitalize(user?.role.role_name ?? "")}
            </Badge>
          </div>
        </div>
      )}

      {/* Main modules grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4 font-display">
          Módulos Principales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {mainModules.map((mod) => (
            <ModuleCard key={mod.to} {...mod} />
          ))}
        </div>
      </div>

      {/* General options */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3 font-display">
          Administración General
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {generalOptions.map((mod) => (
            <ModuleCard key={mod.to} {...mod} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const roleId = user?.role.role_id ?? 1;

  if (roleId === 1) return <SuperuserDashboard />;
  return <TenantDashboard />;
}
