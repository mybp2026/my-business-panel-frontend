import type { UseCashRegistersResult } from "../../hooks/useCashRegisters";

export interface BranchCashRegisterSectionProps {
  branchId: string;
  setBranchId: (id: string) => void;
  branchOptions: { value: string | number; label: string }[];
  cashRegisters: UseCashRegistersResult;
  cashRegisterOptions: { value: string | number; label: string }[];
  onOpenCashRegisterModal: () => void;
}
