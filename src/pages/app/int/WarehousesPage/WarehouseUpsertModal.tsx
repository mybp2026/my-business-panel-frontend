import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

import type { Branch } from "@/interfaces/entities/Branch.interface";

export interface WarehouseFormState {
  branch_id: string;
  warehouse_name: string;
  warehouse_address: string;
}

export interface WarehouseFormErrors {
  branch_id?: string;
  warehouse_name?: string;
  warehouse_address?: string;
}

interface WarehouseUpsertModalProps {
  isOpen: boolean;
  isEditing: boolean;
  /** Whether the row being edited is the branch's sales-floor warehouse. */
  isSalesFloor?: boolean;
  formData: WarehouseFormState;
  formErrors: WarehouseFormErrors;
  branches: Branch[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onChange: (
    updater: (prev: WarehouseFormState) => WarehouseFormState,
  ) => void;
}

export function WarehouseUpsertModal({
  isOpen,
  isEditing,
  isSalesFloor = false,
  formData,
  formErrors,
  branches,
  isSubmitting,
  onClose,
  onSubmit,
  onChange,
}: WarehouseUpsertModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar bodega" : "Nueva bodega"}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
          Las bodegas registradas aquí son almacenes auxiliares vinculados a
          una sucursal existente. El piso de venta de cada sucursal se crea
          automáticamente al registrar la sucursal y se gestiona desde el
          módulo de Sucursales.
        </div>

        {isSalesFloor && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            Esta bodega es el piso de venta de su sucursal. Solo puedes
            actualizar su nombre y dirección desde aquí; el vínculo con la
            sucursal se mantiene fijo para no afectar las ventas en piso.
          </div>
        )}

        <Select
          label="Sucursal"
          value={formData.branch_id || ""}
          onChange={(e) =>
            onChange((p) => ({ ...p, branch_id: e.target.value }))
          }
          options={branches.map((b) => ({
            value: b.branch_id,
            label: `${b.branch_name} (${b.branch_number})`,
          }))}
          placeholder="Seleccionar sucursal"
          error={formErrors.branch_id}
          disabled={isEditing}
          required={!isEditing}
          hint={
            isEditing
              ? "No se puede cambiar la sucursal de una bodega existente"
              : undefined
          }
        />

        <Input
          label="Nombre de la bodega"
          placeholder="Ej: Bodega central"
          value={formData.warehouse_name}
          onChange={(e) =>
            onChange((p) => ({ ...p, warehouse_name: e.target.value }))
          }
          error={formErrors.warehouse_name}
          required
        />
        <Input
          label="Dirección"
          placeholder="Dirección completa"
          value={formData.warehouse_address}
          onChange={(e) =>
            onChange((p) => ({ ...p, warehouse_address: e.target.value }))
          }
          error={formErrors.warehouse_address}
          required
        />

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isSubmitting}
          >
            {isEditing ? "Guardar cambios" : "Crear bodega"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
