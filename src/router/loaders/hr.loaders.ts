import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { conceptApi } from "@/api/concept.api";
import { contractApi } from "@/api/contract.api";
import { dutiesTypeApi } from "@/api/dutiesType.api";
import { employeeApi } from "@/api/employee.api";
import { paysheetApi } from "@/api/paysheet.api";
import { turnsApi } from "@/api/turns.api";
import { userApi } from "@/api/user.api";

import type { Role } from "@/interfaces/entities/Role.interface";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type {
  HrDutiesType,
  HrEmployeeRecord,
  HrPaymentSchedule,
  HrPayrollConcept,
  HrPaysheet,
  HrTurn,
} from "@/interfaces/entities/Hr.interface";
import type { IEmployeeDetail } from "@/interfaces/entities/Employee.interface";
import type { CurrentUserResponse } from "@/interfaces/api/responses/CurrentUserResponse.interface";

const getTurnsForBranches = async (branches: Branch[]): Promise<HrTurn[]> => {
  if (!branches.length) return [];

  const branchTurns = await Promise.all(
    branches.map((branch) => turnsApi.listByBranch(branch.branch_id)),
  );

  return branchTurns.flat().reduce<HrTurn[]>((acc, turn) => {
    if (!acc.some((item) => item.turn_id === turn.turn_id)) {
      acc.push(turn);
    }
    return acc;
  }, []);
};

const getCurrentTenantContext = async (): Promise<{
  currentUser: CurrentUserResponse;
  tenantId: string;
  branches: Branch[];
}> => {
  const currentUser = await authApi.getCurrentUser();
  const tenantId = currentUser?.tenant?.tenant_id ?? "";
  const branchResponse = tenantId
    ? await branchApi.listByTenant(tenantId)
    : { branches: [], total: 0, page: 1, limit: 100 };

  return {
    currentUser,
    tenantId,
    branches: branchResponse.branches,
  };
};

export type HrEmployeesPageLoaderData = {
  currentUser: CurrentUserResponse;
  branches: Branch[];
  employees: HrEmployeeRecord[];
  paymentSchedules: HrPaymentSchedule[];
  turns: HrTurn[];
  roles: Role[];
  dutiesTypes: HrDutiesType[];
};

const fetchHrEmployeesPageData =
  async (): Promise<HrEmployeesPageLoaderData> => {
    const { currentUser, tenantId, branches } = await getCurrentTenantContext();

    const [employees, paymentSchedules, turns, roles, dutiesTypes] =
      await Promise.all([
        tenantId ? employeeApi.listByTenant(tenantId) : Promise.resolve([]),
        contractApi.getPaymentSchedules(),
        getTurnsForBranches(branches),
        userApi.getRoles(),
        tenantId
          ? dutiesTypeApi.listByTenant(tenantId).catch(() => [] as HrDutiesType[])
          : Promise.resolve([] as HrDutiesType[]),
      ]);

    return {
      currentUser,
      branches,
      employees,
      paymentSchedules,
      turns,
      roles,
      dutiesTypes,
    };
  };

export type HrContractsPageLoaderData = HrEmployeesPageLoaderData;

const fetchHrContractsPageData =
  async (): Promise<HrContractsPageLoaderData> => {
    const { currentUser, tenantId, branches } = await getCurrentTenantContext();

    const [employees, paymentSchedules, turns, roles, dutiesTypes] =
      await Promise.all([
        tenantId ? employeeApi.listByTenant(tenantId) : Promise.resolve([]),
        contractApi.getPaymentSchedules(),
        getTurnsForBranches(branches),
        userApi.getRoles(),
        tenantId
          ? dutiesTypeApi.listByTenant(tenantId).catch(() => [] as HrDutiesType[])
          : Promise.resolve([] as HrDutiesType[]),
      ]);

    return {
      currentUser,
      branches,
      employees,
      paymentSchedules,
      turns,
      roles,
      dutiesTypes,
    };
  };

export type HrPayrollPageLoaderData = {
  currentUser: CurrentUserResponse;
  branches: Branch[];
  concepts: HrPayrollConcept[];
  paysheets: HrPaysheet[];
};

const fetchHrPayrollPageData =
  async (): Promise<HrPayrollPageLoaderData> => {
    const { currentUser, tenantId, branches } = await getCurrentTenantContext();

    const [concepts, paysheets] = await Promise.all([
      tenantId ? conceptApi.listByTenant(tenantId) : Promise.resolve([]),
      tenantId ? paysheetApi.listByTenant(tenantId) : Promise.resolve([]),
    ]);

    return {
      currentUser,
      branches,
      concepts,
      paysheets,
    };
  };

export type HrAttendancePageLoaderData = {
  currentUser: CurrentUserResponse;
  currentEmployee: IEmployeeDetail | null;
  branches: Branch[];
  employees: HrEmployeeRecord[];
  turns: HrTurn[];
};

const fetchHrAttendancePageData =
  async (): Promise<HrAttendancePageLoaderData> => {
    const { currentUser, tenantId, branches } = await getCurrentTenantContext();

    const [currentEmployee, employees, turns] = await Promise.all([
      currentUser.user_id
        ? employeeApi.getByUserId(currentUser.user_id)
        : Promise.resolve(null),
      tenantId ? employeeApi.listByTenant(tenantId) : Promise.resolve([]),
      getTurnsForBranches(branches),
    ]);

    return {
      currentUser,
      currentEmployee,
      branches,
      employees,
      turns,
    };
  };

export type HrAmonestacionesPageLoaderData = {
  currentUser: CurrentUserResponse;
  currentEmployee: IEmployeeDetail | null;
  branches: Branch[];
  employees: HrEmployeeRecord[];
};

const fetchHrAmonestacionesPageData =
  async (): Promise<HrAmonestacionesPageLoaderData> => {
    const { currentUser, tenantId, branches } = await getCurrentTenantContext();

    const [currentEmployee, employees] = await Promise.all([
      currentUser.user_id
        ? employeeApi.getByUserId(currentUser.user_id)
        : Promise.resolve(null),
      tenantId ? employeeApi.listByTenant(tenantId) : Promise.resolve([]),
    ]);

    return {
      currentUser,
      currentEmployee,
      branches,
      employees,
    };
  };

/**
 * Carga diferida: cada loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getHrEmployeesPageData = () => ({
  data: fetchHrEmployeesPageData(),
});

export const getHrContractsPageData = () => ({
  data: fetchHrContractsPageData(),
});

export const getHrPayrollPageData = () => ({
  data: fetchHrPayrollPageData(),
});

export const getHrAttendancePageData = () => ({
  data: fetchHrAttendancePageData(),
});

export const getHrAmonestacionesPageData = () => ({
  data: fetchHrAmonestacionesPageData(),
});
