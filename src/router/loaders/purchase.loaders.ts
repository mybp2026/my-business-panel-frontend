import { authApi } from "@/api/auth.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { productApi } from "@/api/product.api";
import { purchaseApi } from "@/api/purchase.api";
import { tenantApi } from "@/api/tenant.api";
import { warehouseApi } from "@/api/warehouse.api";
import { withAuthCheck } from "./utils/withAuthCheck";

import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type { Tenant } from "@/interfaces/entities/Tenant.interface";
import type {
  PaymentAlert,
  PaymentAlertConfigResponse,
  PaymentAlertStats,
  PurchaseAccountPayable,
  PurchaseCatalogs,
  PurchaseOrder,
  Supplier,
} from "@/interfaces/entities/Purchase.interface";
import type { Product } from "@/interfaces/entities/Product.interface";
import type { Warehouse } from "@/interfaces/entities/Warehouse.interface";

export interface SuppliersPageLoaderData {
  suppliers: Supplier[];
  currentTenantId: string;
  currentTenantName: string;
}

export interface PurchasesPageLoaderData {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  products: Product[];
  catalogs: PurchaseCatalogs;
  currentTenantId: string;
  currentTenantName: string;
  isSuperuser: boolean;
  tenants: Tenant[];
  /** Tasa vigente USD -> Bs.; el catálogo de productos está en USD. */
  exchangeRate: ExchangeRate | null;
}

export interface AccountsPayablePageLoaderData {
  payables: PurchaseAccountPayable[];
  catalogs: PurchaseCatalogs;
  currentTenantId: string;
  currentTenantName: string;
  isSuperuser: boolean;
  tenants: Tenant[];
}

export interface PaymentAlertsPageLoaderData {
  alerts: PaymentAlert[];
  stats: PaymentAlertStats;
  configResponse: PaymentAlertConfigResponse;
  currentTenantId: string;
  currentTenantName: string;
  isSuperuser: boolean;
  tenants: Tenant[];
}

export const getSuppliersPageData =
  async (): Promise<SuppliersPageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const currentTenantId = currentUser?.tenant?.tenant_id ?? "";
      const currentTenantName = currentUser?.tenant?.tenant_name ?? "Mi tenant";

      const suppliers = currentTenantId
        ? await purchaseApi.listSuppliers().catch(() => [] as Supplier[])
        : [];

      return { suppliers, currentTenantId, currentTenantName };
    });

export const getPurchasesPageData =
  async (): Promise<PurchasesPageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const isSuperuser = currentUser?.role?.role_hierarchy === 1;
      const currentTenantId = currentUser?.tenant?.tenant_id ?? "";
      const currentTenantName = currentUser?.tenant?.tenant_name ?? "Mi tenant";

      const [
        orders,
        suppliers,
        warehouses,
        productsResponse,
        catalogs,
        tenants,
        exchangeRate,
      ] = await Promise.all([
        purchaseApi.listOrders().catch(() => [] as PurchaseOrder[]),
        currentTenantId
          ? purchaseApi.listSuppliers().catch(() => [] as Supplier[])
          : Promise.resolve([] as Supplier[]),
        currentTenantId
          ? (
              await warehouseApi.listByTenant().catch(() => [] as Warehouse[])
            ).filter((w) => !w.is_branch)
          : Promise.resolve([] as Warehouse[]),
        currentTenantId
          ? productApi.listByTenant(currentTenantId, 1, 200).catch(() => ({
              products: [],
              total: 0,
              page: 1,
              limit: 200,
            }))
          : Promise.resolve({ products: [], total: 0, page: 1, limit: 200 }),
        purchaseApi.getCatalogs().catch(
          () =>
            ({
              order_statuses: [],
              payable_statuses: [],
              payment_methods: [],
              payment_conditions: [],
              currencies: [],
            }) as PurchaseCatalogs,
        ),
        isSuperuser
          ? tenantApi.getAll(1, 200).then((response) => response.tenants ?? [])
          : Promise.resolve([] as Tenant[]),
        exchangeRateApi.getLatest().catch(() => null),
      ]);

      return {
        orders,
        suppliers,
        warehouses,
        products: productsResponse.products ?? [],
        catalogs,
        currentTenantId,
        currentTenantName,
        isSuperuser,
        tenants,
        exchangeRate,
      };
    });

export const getAccountsPayablePageData =
  async (): Promise<AccountsPayablePageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const isSuperuser = currentUser?.role?.role_hierarchy === 1;
      const currentTenantId = currentUser?.tenant?.tenant_id ?? "";
      const currentTenantName = currentUser?.tenant?.tenant_name ?? "Mi tenant";

      const [payables, catalogs, tenants] = await Promise.all([
        purchaseApi.listPayables().catch(() => [] as PurchaseAccountPayable[]),
        purchaseApi.getCatalogs().catch(
          () =>
            ({
              order_statuses: [],
              payable_statuses: [],
              payment_methods: [],
              payment_conditions: [],
              currencies: [],
            }) as PurchaseCatalogs,
        ),
        isSuperuser
          ? tenantApi.getAll(1, 200).then((response) => response.tenants ?? [])
          : Promise.resolve([] as Tenant[]),
      ]);

      return {
        payables,
        catalogs,
        currentTenantId,
        currentTenantName,
        isSuperuser,
        tenants,
      };
    });

export const getPaymentAlertsPageData =
  async (): Promise<PaymentAlertsPageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const isSuperuser = currentUser?.role?.role_hierarchy === 1;
      const currentTenantId = currentUser?.tenant?.tenant_id ?? "";
      const currentTenantName = currentUser?.tenant?.tenant_name ?? "Mi tenant";

      const [alerts, stats, configResponse, tenants] = await Promise.all([
        currentTenantId
          ? purchaseApi
              .listPaymentAlerts(currentTenantId)
              .catch(() => [] as PaymentAlert[])
          : Promise.resolve([] as PaymentAlert[]),
        currentTenantId
          ? purchaseApi.getPaymentAlertStats(currentTenantId).catch(
              () =>
                ({
                  total_alerts: 0,
                  overdue_count: 0,
                  urgent_count: 0,
                  warning_count: 0,
                  total_amount_at_risk: 0,
                }) as PaymentAlertStats,
            )
          : Promise.resolve({
              total_alerts: 0,
              overdue_count: 0,
              urgent_count: 0,
              warning_count: 0,
              total_amount_at_risk: 0,
            }),
        currentTenantId
          ? purchaseApi.getPaymentAlertConfig(currentTenantId).catch(
              () =>
                ({
                  tenant_id: currentTenantId,
                  config: null,
                  alert_types: [],
                }) as PaymentAlertConfigResponse,
            )
          : Promise.resolve({
              tenant_id: currentTenantId,
              config: null,
              alert_types: [],
            }),
        isSuperuser
          ? tenantApi.getAll(1, 200).then((response) => response.tenants ?? [])
          : Promise.resolve([] as Tenant[]),
      ]);

      return {
        alerts,
        stats,
        configResponse,
        currentTenantId,
        currentTenantName,
        isSuperuser,
        tenants,
      };
    });
