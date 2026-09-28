import { useCallback, useEffect, useState } from "react";

import {
  getCashRegistersByBranch,
  getOpenCashSessionsByBranch,
} from "@/router/actions/cashRegister.actions";
import type {
  CashRegister,
  CashRegisterSession,
} from "@/interfaces/entities/CashRegister.interface";

export interface UseCashRegistersResult {
  cashRegisters: CashRegister[];
  cashRegisterId: string;
  setCashRegisterId: (id: string) => void;
  openSessions: CashRegisterSession[];
  isLoadingCashRegisters: boolean;
  refresh: () => Promise<void>;
}

export function useCashRegisters(
  branchId: string,
  onError: (message: string) => void,
): UseCashRegistersResult {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [openSessions, setOpenSessions] = useState<CashRegisterSession[]>([]);
  const [isLoadingCashRegisters, setIsLoadingCashRegisters] = useState(false);

  const refresh = useCallback(async () => {
    if (!branchId) {
      setCashRegisters([]);
      setCashRegisterId("");
      return;
    }

    setIsLoadingCashRegisters(true);
    try {
      const [rows, sessions] = await Promise.all([
        getCashRegistersByBranch(branchId),
        getOpenCashSessionsByBranch(branchId),
      ]);
      const openRegisterIds = new Set(
        sessions.map((session) => session.cash_register_id),
      );
      const openRegisters = rows.filter((register) =>
        openRegisterIds.has(register.cash_register_id),
      );

      setOpenSessions(sessions);
      setCashRegisters(openRegisters);
      setCashRegisterId((prev) =>
        openRegisters.some((register) => register.cash_register_id === prev)
          ? prev
          : (openRegisters[0]?.cash_register_id ?? ""),
      );
    } catch (err) {
      setOpenSessions([]);
      setCashRegisters([]);
      setCashRegisterId("");
      onError(
        err instanceof Error ? err.message : "Error al cargar cajas registradoras",
      );
    } finally {
      setIsLoadingCashRegisters(false);
    }
  }, [branchId, onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    cashRegisters,
    cashRegisterId,
    setCashRegisterId,
    openSessions,
    isLoadingCashRegisters,
    refresh,
  };
}
