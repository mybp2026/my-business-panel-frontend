import { type ReactNode } from "react";
import {
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconContact,
  IconCreditCard,
  IconGrid,
  IconLogout,
  IconMapPin,
  IconPackage,
  IconSettings,
  IconShield,
  IconShoppingCart,
  IconTrendingUp,
  IconUser,
  IconUsers,
} from "@/assets/icons";
import { MODULES, isAllowedForRole } from "@/config/modules";
import { useModule } from "@/context/ModuleContext";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { SidebarCollapsibleGroup } from "@/components/layout/SidebarCollapsibleGroup";

function getIconByName(iconName: string): ReactNode {
  const iconMap: Record<string, ReactNode> = {
    grid: <IconGrid />,
    "shopping-cart": <IconShoppingCart />,
    package: <IconPackage />,
    users: <IconUsers />,
    settings: <IconSettings />,
    "credit-card": <IconCreditCard />,
    "trending-up": <IconTrendingUp />,
    calendar: <IconCalendar />,
    briefcase: <IconBriefcase />,
    user: <IconUser />,
    building: <IconBuilding />,
    "map-pin": <IconMapPin />,
    contact: <IconContact />,
    shield: <IconShield />,
  };

  return iconMap[iconName] || <IconGrid />;
}

interface SidebarContentProps {
  roleId: number;
  userEmail: string;
  roleName: string;
  onLogout: () => void;
  onNavClick?: () => void;
}

export function SidebarContent({
  roleId,
  userEmail,
  roleName,
  onLogout,
  onNavClick,
}: SidebarContentProps) {
  const { currentModule, currentModuleId } = useModule();
  const initials = userEmail.slice(0, 2).toUpperCase();

  const visibleModules = Object.values(MODULES).filter((module) =>
    isAllowedForRole(module.rolesAllowed, roleId),
  );

  const mainItems = currentModule.submodules
    .filter((submodule) => isAllowedForRole(submodule.rolesAllowed, roleId))
    .map((submodule) => ({
      label: submodule.label,
      path: submodule.path,
      icon: getIconByName(submodule.icon),
      end: submodule.end,
    }));

  return (
    <div className="flex h-full flex-col">
      <div className="my-4">
        <SidebarCollapsibleGroup title="Módulos">
          {visibleModules.map((module) => {
            const isActive = currentModuleId === module.id;

            return (
              <SidebarNavItem
                key={module.id}
                item={{
                  label: module.label,
                  path: module.path,
                  icon: getIconByName(module.icon),
                  end: module.id === "general",
                  isActive: isActive,
                }}
                onClick={onNavClick}
              />
            );
          })}
        </SidebarCollapsibleGroup>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <SidebarCollapsibleGroup title={currentModule.label}>
          {mainItems.map((item) => (
            <SidebarNavItem key={item.path} item={item} onClick={onNavClick} />
          ))}
        </SidebarCollapsibleGroup>
      </div>

      <div className="mt-auto p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-600 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-800">
              {userEmail}
            </p>
            <p className="text-xs capitalize text-gray-400">{roleName}</p>
          </div>
          <button
            onClick={onLogout}
            title="Cerrar sesion"
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );
}
