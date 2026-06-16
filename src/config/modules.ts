// Module definitions with colors, icons, and submodules

export type ModuleId = "general" | "pos" | "int" | "sch" | "hr" | "fnz";

export interface SubModule {
  id: string;
  label: string;
  path: string;
  icon:
    | "grid"
    | "shopping-cart"
    | "package"
    | "file-text"
    | "users"
    | "settings"
    | "credit-card"
    | "trending-up"
    | "clipboard"
    | "calendar"
    | "briefcase"
    | "user"
    | "map-pin"
    | "contact"
    | "building"
    | "tag"
    | "shield"
    | "trending-down"
    | "gift";
  /** Si está definido, solo los roles listados pueden acceder. Si es undefined, todos pueden. */
  rolesAllowed?: number[];
  end?: boolean;
}

export interface Module {
  id: ModuleId;
  label: string;
  description: string;
  color: "blue" | "purple" | "amber" | "green" | "red";
  code: string;
  path: string;
  icon:
    | "shopping-cart"
    | "package"
    | "file-text"
    | "users"
    | "briefcase"
    | "credit-card";
  submodules: SubModule[];
  /** Si está definido, solo los roles listados pueden acceder. Si es undefined, todos pueden. */
  rolesAllowed?: number[];
}

export const MODULES: Record<ModuleId, Module> = {
  general: {
    id: "general",
    label: "General",
    description: "Gestion general del sistema",
    color: "blue",
    code: "GEN",
    path: "/app",
    icon: "briefcase",
    rolesAllowed: [1, 2, 3],
    submodules: [
      {
        id: "dashboard",
        label: "Dashboard",
        path: "/app/dashboard",
        icon: "grid",
      },
      { id: "users", label: "Usuarios", path: "/app/users", icon: "users" },
      {
        id: "branches",
        label: "Sucursales",
        path: "/app/branches",
        icon: "map-pin",
      },
      {
        id: "products",
        label: "Productos",
        path: "/app/products",
        icon: "package",
      },
      {
        id: "attributes",
        label: "Atributos y Familias",
        path: "/app/attributes",
        icon: "tag",
      },
      {
        id: "customers",
        label: "Clientes",
        path: "/app/customers",
        icon: "contact",
      },
      {
        id: "settings",
        label: "Configuracion",
        path: "/app/settings",
        icon: "settings",
      },
      {
        id: "tenants",
        label: "Tenants",
        path: "/app/tenants",
        icon: "briefcase",
        rolesAllowed: [1],
      },
      {
        id: "special-codes",
        label: "Códigos especiales",
        path: "/app/special-codes",
        icon: "shield",
        rolesAllowed: [1],
      },
      { id: "profile", label: "Mi perfil", path: "/app/profile", icon: "user" },
    ],
  },

  pos: {
    id: "pos",
    label: "POS",
    description: "Punto de venta y transacciones",
    color: "blue",
    code: "POS",
    path: "/app/pos",
    icon: "shopping-cart",
    submodules: [
      {
        id: "create-sale",
        label: "Crear venta",
        path: "/app/pos/sales/new",
        icon: "shopping-cart",
      },
      {
        id: "cash-sessions",
        label: "Sesiones de caja",
        path: "/app/pos/cash-sessions",
        icon: "credit-card",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "sales-history",
        label: "Registro de ventas",
        path: "/app/pos/sales",
        icon: "trending-up",
        rolesAllowed: [2, 3],
        end: true,
      },
      {
        id: "refunds",
        label: "Reembolsos",
        path: "/app/pos/refunds",
        icon: "package",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "promotions",
        label: "Promociones",
        path: "/app/pos/promotions",
        icon: "trending-up",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "expenses",
        label: "Gastos",
        path: "/app/pos/expenses",
        icon: "trending-down",
        rolesAllowed: [1, 2, 3, 4],
      },
      {
        id: "royalties",
        label: "Regalías",
        path: "/app/pos/royalties",
        icon: "gift",
        rolesAllowed: [1, 2],
      },
      {
        id: "receivables",
        label: "Cuentas por cobrar",
        path: "/app/pos/receivables",
        icon: "credit-card",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "collection-alerts",
        label: "Alertas de cobro",
        path: "/app/pos/collection-alerts",
        icon: "calendar",
        rolesAllowed: [1, 2, 3],
      },
    ],
  },

  int: {
    id: "int",
    label: "Inventory",
    description: "Gestión de inventario",
    color: "purple",
    code: "INT",
    path: "/app/int",
    icon: "package",
    submodules: [
      {
        id: "inventory",
        label: "Inventario",
        path: "/app/int/inventory",
        icon: "package",
        rolesAllowed: [1, 2, 3, 4],
      },
      {
        id: "movements",
        label: "Movimientos",
        path: "/app/int/movements",
        icon: "trending-up",
      },
      {
        id: "warehouses",
        label: "Almacenes",
        path: "/app/int/warehouses",
        icon: "building",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "reports",
        label: "Reportes",
        path: "/app/int/reports",
        icon: "file-text",
        rolesAllowed: [1, 2, 3],
      },
    ],
  },

  sch: {
    id: "sch",
    label: "Compras",
    description: "Gestión de compras",
    color: "amber",
    code: "SCH",
    path: "/app/sch",
    icon: "file-text",
    rolesAllowed: [1, 2, 3],
    submodules: [
      {
        id: "purchases",
        label: "Compras",
        path: "/app/sch/purchases",
        icon: "shopping-cart",
      },
      {
        id: "orders",
        label: "Cuentas por pagar",
        path: "/app/sch/payables",
        icon: "credit-card",
      },
      {
        id: "suppliers",
        label: "Proveedores",
        path: "/app/sch/suppliers",
        icon: "briefcase",
      },
      {
        id: "analytics",
        label: "Alertas de pago",
        path: "/app/sch/payment-alerts",
        icon: "calendar",
      },
    ],
  },

  hr: {
    id: "hr",
    label: "Recursos Humanos",
    description: "Gestión de recursos humanos",
    color: "green",
    code: "HR",
    path: "/app/hr",
    icon: "users",
    submodules: [
      {
        id: "employees",
        label: "Empleados",
        path: "/app/hr/employees",
        icon: "users",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "contracts",
        label: "Contratos",
        path: "/app/hr/contracts",
        icon: "briefcase",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "payroll",
        label: "Nomina",
        path: "/app/hr/payroll",
        icon: "credit-card",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "attendance",
        label: "Horarios",
        path: "/app/hr/attendance",
        icon: "calendar",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "amonestaciones",
        label: "Amonestaciones",
        path: "/app/hr/amonestaciones",
        icon: "shield",
      },
    ],
  },

  fnz: {
    id: "fnz",
    label: "Finanzas",
    description: "Gestion financiera",
    color: "red",
    code: "FNZ",
    path: "/app/fnz",
    icon: "credit-card",
    rolesAllowed: [1, 2, 3],
    submodules: [
      {
        id: "accounts",
        label: "Cuentas",
        path: "/app/fnz/accounts",
        icon: "credit-card",
      },
      {
        id: "expenses",
        label: "Gastos",
        path: "/app/fnz/expenses",
        icon: "trending-down",
        rolesAllowed: [1, 2, 3],
      },
      {
        id: "accounting",
        label: "Contabilidad",
        path: "/app/fnz/accounting",
        icon: "briefcase",
      },
      {
        id: "reports",
        label: "Reportes",
        path: "/app/fnz/reports",
        icon: "file-text",
      },
      {
        id: "budgets",
        label: "Presupuestos",
        path: "/app/fnz/budgets",
        icon: "credit-card",
      },
      {
        id: "analytics",
        label: "Analisis",
        path: "/app/fnz/analytics",
        icon: "trending-up",
      },
    ],
  },
};

export function isAllowedForRole(
  rolesAllowed: number[] | undefined,
  roleId: number,
): boolean {
  if (!rolesAllowed) return true;
  return rolesAllowed.includes(roleId);
}

export function getFirstAllowedSubmodulePath(
  module: Module,
  roleId: number,
): string {
  const first = module.submodules.find((sub) =>
    isAllowedForRole(sub.rolesAllowed, roleId),
  );
  return first?.path ?? module.path;
}

export function getModuleColor(moduleId: ModuleId): string {
  const colorMap = {
    blue: "#3b82f6",
    purple: "#a855f7",
    amber: "#f59e0b",
    green: "#22c55e",
    red: "#ef4444",
  };
  return colorMap[MODULES[moduleId].color];
}

export function getModuleColorClasses(moduleId: ModuleId) {
  const classMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      accent: "text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      accent: "text-purple-600",
      button: "bg-purple-600 hover:bg-purple-700 text-white",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      accent: "text-amber-600",
      button: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      accent: "text-green-600",
      button: "bg-green-600 hover:bg-green-700 text-white",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      accent: "text-red-600",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
  };
  return classMap[MODULES[moduleId].color];
}
