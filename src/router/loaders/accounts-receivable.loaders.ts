import { authApi } from "@/api/auth.api";
import { accountsReceivableApi } from "@/api/accounts-receivable.api";
import { tenantApi } from "@/api/tenant.api";
import { withAuthCheck } from "./utils/withAuthCheck";

import type { Tenant } from "@/interfaces/entities/Tenant.interface";
import type {
  CollectionAlert,
  CollectionAlertConfigResponse,
  CollectionAlertStats,
  ReceivableCatalogs,
  SaleAccountReceivable,
} from "@/interfaces/entities/AccountReceivable.interface";

export interface AccountsReceivablePageLoaderData {
  receivables: SaleAccountReceivable[];
  total: number;
  page: number;
  limit: number;
  catalogs: ReceivableCatalogs;
  currentTenantId: string;
  currentTenantName: string;
  isSuperuser: boolean;
  tenants: Tenant[];
}

export interface CollectionAlertsPageLoaderData {
  alerts: CollectionAlert[];
  stats: CollectionAlertStats;
  configResponse: CollectionAlertConfigResponse;
  currentTenantId: string;
  currentTenantName: string;
  isSuperuser: boolean;
  tenants: Tenant[];
}

export const getAccountsReceivablePageData =
  async (): Promise<AccountsReceivablePageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const isSuperuser = currentUser?.role?.role_hierarchy === 1;
      const currentTenantId = currentUser?.tenant?.tenant_id ?? "";
      const currentTenantName = currentUser?.tenant?.tenant_name ?? "Mi tenant";

      const [receivableList, catalogs, tenants] = await Promise.all([
        accountsReceivableApi.listReceivables(1, 50).catch(
          () =>
            ({
              receivables: [] as SaleAccountReceivable[],
              total: 0,
              page: 1,
              limit: 50,
            }),
        ),
        accountsReceivableApi.getCatalogs().catch(
          () =>
            ({
              receivable_statuses: [],
              payment_methods: [],
              currencies: [],
            }) as ReceivableCatalogs,
        ),
        isSuperuser
          ? tenantApi.getAll(1, 200).then((response) => response.tenants ?? [])
          : Promise.resolve([] as Tenant[]),
      ]);

      return {
        receivables: receivableList.receivables,
        total: receivableList.total,
        page: receivableList.page,
        limit: receivableList.limit,
        catalogs,
        currentTenantId,
        currentTenantName,
        isSuperuser,
        tenants,
      };
    });

export const getCollectionAlertsPageData =
  async (): Promise<CollectionAlertsPageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const isSuperuser = currentUser?.role?.role_hierarchy === 1;
      const currentTenantId = currentUser?.tenant?.tenant_id ?? "";
      const currentTenantName = currentUser?.tenant?.tenant_name ?? "Mi tenant";

      const [alerts, stats, configResponse, tenants] = await Promise.all([
        currentTenantId
          ? accountsReceivableApi
              .listCollectionAlerts(currentTenantId)
              .catch(() => [] as CollectionAlert[])
          : Promise.resolve([] as CollectionAlert[]),
        currentTenantId
          ? accountsReceivableApi.getCollectionAlertStats(currentTenantId).catch(
              () =>
                ({
                  total_alerts: 0,
                  overdue_count: 0,
                  urgent_count: 0,
                  warning_count: 0,
                  total_amount_at_risk: 0,
                }) as CollectionAlertStats,
            )
          : Promise.resolve({
              total_alerts: 0,
              overdue_count: 0,
              urgent_count: 0,
              warning_count: 0,
              total_amount_at_risk: 0,
            }),
        currentTenantId
          ? accountsReceivableApi
              .getCollectionAlertConfig(currentTenantId)
              .catch(
                () =>
                  ({
                    tenant_id: currentTenantId,
                    config: null,
                    alert_types: [],
                  }) as CollectionAlertConfigResponse,
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
