import { Select } from "@/components/ui/Select";

import type { BranchCashRegisterSectionProps } from "./BranchCashRegisterSectionProps";

export function BranchCashRegisterSection({
  branchId,
  setBranchId,
  branchOptions,
  cashRegisters,
  cashRegisterOptions,
  onOpenCashRegisterModal,
}: BranchCashRegisterSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-300 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Sucursal y caja
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Sucursal"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          options={branchOptions}
          placeholder="Seleccionar sucursal"
          required
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Caja<span className="ml-0.5 text-accent-500">*</span>
            </label>
            <button
              type="button"
              onClick={onOpenCashRegisterModal}
              disabled={!branchId}
              className="text-xs cursor-pointer font-medium text-accent-700 hover:text-accent-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Abrir / cerrar cajas
            </button>
          </div>
          <Select
            value={cashRegisters.cashRegisterId}
            onChange={(e) => cashRegisters.setCashRegisterId(e.target.value)}
            options={
              cashRegisterOptions.length
                ? cashRegisterOptions
                : [
                    {
                      value: "",
                      label: cashRegisters.isLoadingCashRegisters
                        ? "Cargando cajas..."
                        : "No hay cajas con sesion abierta en esta sucursal",
                    },
                  ]
            }
            disabled={
              cashRegisters.isLoadingCashRegisters ||
              cashRegisterOptions.length === 0
            }
            required
          />
        </div>
      </div>
    </div>
  );
}
