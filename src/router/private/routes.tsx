import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedLayout } from "./ProtectedLayout";
import {
  MODULES,
  getFirstAllowedSubmodulePath,
  type ModuleId,
} from "@/config/modules";
import { useAuth } from "@/context/AuthContext";

function ModuleRedirect({ moduleId }: { moduleId: ModuleId }) {
  const { user } = useAuth();
  const roleId = user?.role.role_id ?? 1;
  const path = getFirstAllowedSubmodulePath(MODULES[moduleId], roleId);
  return <Navigate to={path} replace />;
}

import { DashboardPage } from "@/pages/app/DashboardPage/DashboardPage";
import { TenantsPage } from "@/pages/app/TenantsPage";
import { TenantDetailPage } from "@/pages/app/TenantDetailPage";
import { ProfilePage } from "@/pages/app/ProfilePage";
import { ComingSoon } from "@/pages/app/ComingSoon";
import { authApi } from "@/api/auth.api";

import { getUsersPageData } from "@/router/loaders/user.loaders";
import { getBranchesPageData } from "@/router/loaders/branch.loaders";
import { getCustomersPageData } from "@/router/loaders/customer.loaders";
import { getAllSegments } from "@/router/loaders/segment.loaders";
import { getMarginsByTenant } from "@/router/loaders/margin.loaders";
import { getProductsPageData } from "@/router/loaders/product.loaders";
import {
  getCreateSalePageData,
  getSalesHistoryPageData,
} from "@/router/loaders/sale.loaders";
import { getCashSessionsPageData } from "@/router/loaders/cashRegister.loaders";
import { getRefundsPageData } from "@/router/loaders/returns.loaders";
import { getPromotionsPageData } from "@/router/loaders/promotion.loaders";
import { getPosExpensePageData } from "@/router/loaders/posExpense.loaders";
import { getRoyaltiesPageData } from "@/router/loaders/royalties.loaders";
import { getWarehousesPageData } from "@/router/loaders/warehouse.loaders";
import { getInventoryPageData } from "@/router/loaders/inventory.loaders";
import { getMovementsPageData } from "@/router/loaders/inventoryTransfer.loaders";
import { getReportsPageData } from "@/router/loaders/inventoryReports.loaders";
import {
  getAccountsPayablePageData,
  getPaymentAlertsPageData,
  getPurchasesPageData,
  getSuppliersPageData,
} from "@/router/loaders/purchase.loaders";
import {
  getAccountsReceivablePageData,
  getCollectionAlertsPageData,
} from "@/router/loaders/accounts-receivable.loaders";
import { getAccountsOverviewPageData } from "@/router/loaders/finances.loaders";
import { getProfitabilityPageData } from "@/router/loaders/profitability.loaders";
import {
  getHrAmonestacionesPageData,
  getHrAttendancePageData,
  getHrContractsPageData,
  getHrEmployeesPageData,
  getHrPayrollPageData,
} from "@/router/loaders/hr.loaders";
import { getFnzExpensePageData } from "@/router/loaders/fnzExpense.loaders";

export const privateRoutes: RouteObject[] = [
  {
    path: "/app",
    element: <ProtectedLayout />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "tenants", element: <TenantsPage /> },
          { path: "tenants/:tenantId", element: <TenantDetailPage /> },
          {
            path: "special-codes",
            lazy: async () => {
              const { SpecialCodesPage } =
                await import("@/pages/app/SpecialCodesPage/SpecialCodesPage");
              return { Component: SpecialCodesPage };
            },
          },

          {
            path: "users",
            loader: getUsersPageData,
            lazy: async () => {
              const { UsersPage } =
                await import("@/pages/app/UsersPage/UsersPage");
              return { Component: UsersPage };
            },
          },

          {
            path: "branches",
            loader: getBranchesPageData,
            lazy: async () => {
              const { BranchesPage } =
                await import("@/pages/app/BranchesPage/BranchesPage");
              return { Component: BranchesPage };
            },
          },
          {
            path: "products",
            loader: getProductsPageData,
            lazy: async () => {
              const { ProductsPage } =
                await import("@/pages/app/ProductsPage/ProductsPage");
              return { Component: ProductsPage };
            },
          },
          {
            path: "attributes",
            lazy: async () => {
              const { AttributesPage } =
                await import("@/pages/app/AttributesPage/AttributesPage");
              return { Component: AttributesPage };
            },
          },
          {
            path: "customers",
            loader: getCustomersPageData,
            lazy: async () => {
              const { CustomersPage } =
                await import("@/pages/app/CustomersPage/CustomersPage");
              return { Component: CustomersPage };
            },
          },
          {
            path: "settings",
            loader: async () => {
              const segments = await getAllSegments();
              const currentUser = await authApi.getCurrentUser();
              const tenantId = currentUser?.tenant?.tenant_id;
              const margins = tenantId
                ? await getMarginsByTenant(tenantId)
                : [];

              return { segments, margins };
            },
            lazy: async () => {
              const { SettingsPage } =
                await import("@/pages/app/SettingsPage/SettingsPage");
              return { Component: SettingsPage };
            },
          },
          { path: "profile", element: <ProfilePage /> },

          // POS Module
          {
            path: "pos/sales/new",
            loader: getCreateSalePageData,
            lazy: async () => {
              const { CreateSalePage } =
                await import("@/pages/app/CreateSalePage/CreateSalePage");
              return { Component: CreateSalePage };
            },
          },
          {
            path: "pos/sales",
            loader: getSalesHistoryPageData,
            lazy: async () => {
              const { SalesHistoryPage } =
                await import("@/pages/app/SalesHistoryPage/SalesHistoryPage");
              return { Component: SalesHistoryPage };
            },
          },
          {
            path: "pos/cash-sessions",
            loader: getCashSessionsPageData,
            lazy: async () => {
              const { CashSessionsPage } =
                await import("@/pages/app/CashSessionsPage/CashSessionsPage");
              return { Component: CashSessionsPage };
            },
          },
          {
            path: "pos/refunds",
            loader: getRefundsPageData,
            lazy: async () => {
              const { RefundsPage } =
                await import("@/pages/app/RefundsPage/RefundsPage");
              return { Component: RefundsPage };
            },
          },
          {
            path: "pos/promotions",
            loader: getPromotionsPageData,
            lazy: async () => {
              const { PromotionsPage } =
                await import("@/pages/app/PromotionsPage/PromotionsPage");
              return { Component: PromotionsPage };
            },
          },
          {
            path: "pos/expenses",
            loader: getPosExpensePageData,
            lazy: async () => {
              const { PosExpensePage } =
                await import("@/pages/app/PosExpensePage/PosExpensePage");
              return { Component: PosExpensePage };
            },
          },
          {
            path: "pos/royalties",
            loader: getRoyaltiesPageData,
            lazy: async () => {
              const { RoyaltiesPage } =
                await import("@/pages/app/RoyaltiesPage/RoyaltiesPage");
              return { Component: RoyaltiesPage };
            },
          },
          {
            path: "pos/receivables",
            loader: getAccountsReceivablePageData,
            lazy: async () => {
              const { AccountsReceivablePage } =
                await import("@/pages/app/AccountsReceivablePage/AccountsReceivablePage");
              return { Component: AccountsReceivablePage };
            },
          },
          {
            path: "pos/collection-alerts",
            loader: getCollectionAlertsPageData,
            lazy: async () => {
              const { CollectionAlertsPage } =
                await import("@/pages/app/CollectionAlertsPage/CollectionAlertsPage");
              return { Component: CollectionAlertsPage };
            },
          },
          {
            path: "pos/*",
            element: <ModuleRedirect moduleId="pos" />,
          },

          // INT (Inventory) Module
          {
            path: "int/inventory",
            loader: getInventoryPageData,
            lazy: async () => {
              const { InventoryPage } =
                await import("@/pages/app/InventoryPage/InventoryPage");
              return { Component: InventoryPage };
            },
          },
          {
            path: "int/warehouses",
            loader: getWarehousesPageData,
            lazy: async () => {
              const { WarehousesPage } =
                await import("@/pages/app/WarehousesPage/WarehousesPage");
              return { Component: WarehousesPage };
            },
          },
          {
            path: "int/movements",
            loader: getMovementsPageData,
            lazy: async () => {
              const { MovementsPage } =
                await import("@/pages/app/MovementsPage/MovementsPage");
              return { Component: MovementsPage };
            },
          },
          {
            path: "int/reports",
            loader: getReportsPageData,
            lazy: async () => {
              const { ReportsPage } =
                await import("@/pages/app/ReportsPage/ReportsPage");
              return { Component: ReportsPage };
            },
          },
          {
            path: "int/*",
            element: <ModuleRedirect moduleId="int" />,
          },

          // SCH (Supply Chain) Module
          {
            path: "sch/purchases",
            loader: getPurchasesPageData,
            lazy: async () => {
              const { PurchasesPage } =
                await import("@/pages/app/PurchasesPage/PurchasesPage");
              return { Component: PurchasesPage };
            },
          },
          {
            path: "sch/orders",
            element: <Navigate to="/app/sch/payables" replace />,
          },
          {
            path: "sch/suppliers",
            loader: getSuppliersPageData,
            lazy: async () => {
              const { SuppliersPage } =
                await import("@/pages/app/SuppliersPage/SuppliersPage");
              return { Component: SuppliersPage };
            },
          },
          {
            path: "sch/payables",
            loader: getAccountsPayablePageData,
            lazy: async () => {
              const { AccountsPayablePage } =
                await import("@/pages/app/AccountsPayablePage/AccountsPayablePage");
              return { Component: AccountsPayablePage };
            },
          },
          {
            path: "sch/analytics",
            element: <Navigate to="/app/sch/payment-alerts" replace />,
          },
          {
            path: "sch/payment-alerts",
            loader: getPaymentAlertsPageData,
            lazy: async () => {
              const { PaymentAlertsPage } =
                await import("@/pages/app/PaymentAlertsPage/PaymentAlertsPage");
              return { Component: PaymentAlertsPage };
            },
          },
          {
            path: "sch/*",
            element: <ModuleRedirect moduleId="sch" />,
          },

          // HR (Human Resources) Module
          {
            path: "hr/employees",
            loader: getHrEmployeesPageData,
            lazy: async () => {
              const { HREmployeesPage } =
                await import("@/pages/app/HREmployeesPage/HREmployeesPage");
              return { Component: HREmployeesPage };
            },
          },
          {
            path: "hr/contracts",
            loader: getHrContractsPageData,
            lazy: async () => {
              const { HRContractsPage } =
                await import("@/pages/app/HRContractsPage/HRContractsPage");
              return { Component: HRContractsPage };
            },
          },
          {
            path: "hr/payroll",
            loader: getHrPayrollPageData,
            lazy: async () => {
              const { HRPayrollPage } =
                await import("@/pages/app/HRPayrollPage/HRPayrollPage");
              return { Component: HRPayrollPage };
            },
          },
          {
            path: "hr/attendance",
            loader: getHrAttendancePageData,
            lazy: async () => {
              const { HRAttendancePage } =
                await import("@/pages/app/HRAttendancePage/HRAttendancePage");
              return { Component: HRAttendancePage };
            },
          },
          {
            path: "hr/amonestaciones",
            loader: getHrAmonestacionesPageData,
            lazy: async () => {
              const { HRAmonestacionesPage } =
                await import("@/pages/app/HRAmonestacionesPage/HRAmonestacionesPage");
              return { Component: HRAmonestacionesPage };
            },
          },
          {
            path: "hr/*",
            element: <ModuleRedirect moduleId="hr" />,
          },

          // FNZ (Finances) Module
          {
            path: "fnz/accounts",
            loader: getAccountsOverviewPageData,
            lazy: async () => {
              const { AccountsOverviewPage } =
                await import("@/pages/app/AccountsOverviewPage/AccountsOverviewPage");
              return { Component: AccountsOverviewPage };
            },
          },
          {
            path: "fnz/profitability",
            loader: getProfitabilityPageData,
            lazy: async () => {
              const { ProfitabilityPage } =
                await import("@/pages/app/ProfitabilityPage/ProfitabilityPage");
              return { Component: ProfitabilityPage };
            },
          },
          {
            path: "fnz/expenses",
            loader: getFnzExpensePageData,
            lazy: async () => {
              const { FnzExpensePage } =
                await import("@/pages/app/FnzExpensePage/FnzExpensePage");
              return { Component: FnzExpensePage };
            },
          },
          {
            path: "fnz/accounting",
            element: <ComingSoon title="FNZ - Contabilidad" />,
          },
          {
            path: "fnz/reports",
            element: <ComingSoon title="FNZ - Reportes" />,
          },
          {
            path: "fnz/budgets",
            element: <ComingSoon title="FNZ - Presupuestos" />,
          },
          {
            path: "fnz/analytics",
            element: <ComingSoon title="FNZ - Análisis" />,
          },
          {
            path: "fnz/*",
            element: <ModuleRedirect moduleId="fnz" />,
          },

          { path: "*", element: <Navigate to="dashboard" replace /> },
        ],
      },
    ],
  },
];
