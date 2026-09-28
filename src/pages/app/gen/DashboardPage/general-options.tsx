import { IconContact } from "@/assets/icons/IconContact";
import { IconMapPin } from "@/assets/icons/IconMapPin";
import { IconPackage } from "@/assets/icons/IconPackage";
import { IconSettings } from "@/assets/icons/IconSettings";
import { IconUsers } from "@/assets/icons/IconUsers";
import type { ModuleCardProps } from "@/interfaces/components/ui/ModuleCardProps.interface";

export const generalOptions: ModuleCardProps[] = [
  {
    label: "Usuarios",
    description: "Gestiona los usuarios y roles del sistema",
    icon: <IconUsers />,
    to: "/app/users",
    code: "GEN",
    accentColor: "blue",
  },
  {
    label: "Productos",
    description: "Catálogo de productos y servicios",
    icon: <IconPackage />,
    to: "/app/products",
    code: "GEN",
    accentColor: "purple",
  },
  {
    label: "Clientes",
    description: "Directorio de clientes y contactos",
    icon: <IconContact />,
    to: "/app/customers",
    code: "GEN",
    accentColor: "green",
  },
  {
    label: "Sucursales",
    description: "Gestiona las sucursales de tu empresa",
    icon: <IconMapPin />,
    to: "/app/branches",
    code: "GEN",
    accentColor: "amber",
  },
  {
    label: "Configuración",
    description: "Segmentos, márgenes y catálogos",
    icon: <IconSettings />,
    to: "/app/settings",
    code: "GEN",
    accentColor: "red",
  },
  {
    label: "Mi Perfil",
    description: "Actualiza tu información personal",
    icon: <IconUsers />,
    to: "/app/profile",
    code: "GEN",
    accentColor: "blue",
  },
];
