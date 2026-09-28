import { authApi } from "@/api/auth.api";
import { branchApi } from "@/api/branch.api";
import { cashRegisterApi } from "@/api/cashRegister.api";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type {
  CashRegister,
  CashRegisterSession,
} from "@/interfaces/entities/CashRegister.interface";
import type { CurrentUserResponse } from "@/interfaces/api/responses/CurrentUserResponse.interface";

export interface CashSessionsPageLoaderData {
  currentUser: CurrentUserResponse | null;
  branches: Branch[];
  initialSessions: CashRegisterSession[];
  initialRegisters: CashRegister[];
}

const dedupeRegisters = (registers: CashRegister[]): CashRegister[] => {
  const seen = new Set<string>();
  return registers.filter((register) => {
    if (seen.has(register.cash_register_id)) {
      return false;
    }
    seen.add(register.cash_register_id);
    return true;
  });
};

export const getCashRegistersByBranches = async (
  branches: Branch[],
): Promise<CashRegister[]> => {
  if (!branches.length) return [];

  const groupedRegisters = await Promise.all(
    branches.map((branch) =>
      cashRegisterApi.list(branch.branch_id).catch(() => []),
    ),
  );

  return dedupeRegisters(groupedRegisters.flat());
};

const fetchCashSessionsPageData =
  async (): Promise<CashSessionsPageLoaderData> => {
    const currentUser = await authApi.getCurrentUser();
    const tenantId = currentUser?.tenant?.tenant_id;

    const [branchesRes, initialSessions] = await Promise.all([
      tenantId
        ? branchApi.listByTenant(tenantId, 1, 200)
        : Promise.resolve({ branches: [], total: 0, page: 1, limit: 200 }),
      cashRegisterApi.listSessions().catch((e: unknown) => {
        console.error("[CashSessions] sessions load error:", e);
        return [] as import("@/interfaces/entities/CashRegister.interface").CashRegisterSession[];
      }),
    ]);

    const branches = branchesRes.branches ?? [];
    const initialRegisters = await getCashRegistersByBranches(branches);

    return {
      currentUser,
      branches,
      initialSessions,
      initialRegisters,
    };
  };

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getCashSessionsPageData = () => ({
  data: fetchCashSessionsPageData(),
});

export const getCashSessions = async (filters?: {
  branchId?: string;
  isActive?: boolean | null;
}): Promise<CashRegisterSession[]> => cashRegisterApi.listSessions(filters);
