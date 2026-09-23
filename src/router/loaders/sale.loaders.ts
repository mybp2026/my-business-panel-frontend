import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { creditDebitNoteApi } from "@/api/creditDebitNote.api";
import { customerApi } from "@/api/customer.api";
import { employeeApi } from "@/api/employee.api";
import { productApi } from "@/api/product.api";
import { saleApi } from "@/api/sale.api";
import { withAuthCheck } from "./utils/withAuthCheck";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Product } from "@/interfaces/entities/Product.interface";
import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { CreditDebitNoteListItem } from "@/interfaces/entities/CreditDebitNote.interface";
import type { CurrentUserResponse } from "@/interfaces/api/responses/CurrentUserResponse.interface";
import type { PaginatedResponse } from "@/interfaces/api/responses/PaginatedResponse.interface";
import type {
  SaleCondition,
  SaleListItem,
} from "@/interfaces/entities/Sale.interface";

export const SALES_PAGE_LIMIT = 100;

export interface CreateSalePageLoaderData {
  currentUser: CurrentUserResponse | null;
  branches: Branch[];
  saleConditions: SaleCondition[];
  initialProducts: Product[];
  initialCustomers: Customer[];
}

export const getCreateSalePageData =
  async (): Promise<CreateSalePageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const tenantId = currentUser?.tenant?.tenant_id;
      const userId = currentUser?.user_id;

      let branches: Branch[] = [];

      if (tenantId) {
        const branchesRes = await branchApi
          .listByTenant(tenantId, 1, 200)
          .catch(() => null);
        branches = branchesRes?.branches ?? [];
      }

      if (branches.length === 0 && userId) {
        const employee = await employeeApi
          .getByUserId(userId)
          .catch(() => null);
        if (employee?.branch_id) {
          const branch = await branchApi
            .getById(employee.branch_id)
            .catch(() => null);
          if (branch) branches = [branch];
        }
      }

      const [conditionsRes, productsRes, customersRes] = await Promise.all([
        saleApi.getSaleConditions().catch(() => []),
        tenantId
          ? productApi.listByTenant(tenantId, 1, 100)
          : Promise.resolve({ products: [], total: 0, page: 1, limit: 100 }),
        tenantId
          ? customerApi.listByTenant(tenantId, 1, 100)
          : Promise.resolve({
              customers: [],
              total: 0,
              page: 1,
              limit: 100,
            }),
      ]);

      return {
        currentUser,
        branches,
        saleConditions: conditionsRes ?? [],
        initialProducts: productsRes.products ?? [],
        initialCustomers: customersRes.customers ?? [],
      };
    });

export interface SalesHistoryPageLoaderData {
  currentUser: CurrentUserResponse | null;
  branches: Branch[];
  initialSales: PaginatedResponse<SaleListItem>;
  initialBranchId: string;
  creditDebitNotes: CreditDebitNoteListItem[];
}

export const getSalesHistoryPageData =
  async (): Promise<SalesHistoryPageLoaderData> =>
    withAuthCheck(async () => {
      const currentUser = await authApi.getCurrentUser();
      const tenantId = currentUser?.tenant?.tenant_id;
      const userId = currentUser?.user_id;

      let branches: Branch[] = [];

      if (tenantId) {
        const branchesRes = await branchApi
          .listByTenant(tenantId, 1, 200)
          .catch(() => null);
        branches = branchesRes?.branches ?? [];
      }

      if (branches.length === 0 && userId) {
        const employee = await employeeApi
          .getByUserId(userId)
          .catch(() => null);
        if (employee?.branch_id) {
          const branch = await branchApi
            .getById(employee.branch_id)
            .catch(() => null);
          if (branch) branches = [branch];
        }
      }

      const initialBranchId = branches[0]?.branch_id ?? "";

      const initialSales = initialBranchId
        ? await saleApi
            .listByBranch(initialBranchId, 1, SALES_PAGE_LIMIT)
            .catch(
              (): PaginatedResponse<SaleListItem> => ({
                results: [],
                total: 0,
                page: 1,
                limit: SALES_PAGE_LIMIT,
              }),
            )
        : ({
            results: [],
            total: 0,
            page: 1,
            limit: SALES_PAGE_LIMIT,
          } as PaginatedResponse<SaleListItem>);

      const creditDebitNotes = await creditDebitNoteApi
        .listByTenant()
        .catch(() => [] as CreditDebitNoteListItem[]);

      return {
        currentUser,
        branches,
        initialSales,
        initialBranchId,
        creditDebitNotes,
      };
    });

export const getSalesByBranch = async (
  branchId: string,
  page = 1,
  limit = SALES_PAGE_LIMIT,
): Promise<PaginatedResponse<SaleListItem>> =>
  saleApi.listByBranch(branchId, page, limit);

export const getSalesByTenant = async (
  page = 1,
  limit = SALES_PAGE_LIMIT,
): Promise<PaginatedResponse<SaleListItem>> =>
  saleApi.listByTenant(page, limit);
