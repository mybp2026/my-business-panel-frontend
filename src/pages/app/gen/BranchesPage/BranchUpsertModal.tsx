import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

import type { Tenant } from "@/interfaces/entities/Tenant.interface";

interface BranchFormState {
  branch_name: string;
  branch_number: string;
  branch_address: string;
  is_main_branch: boolean;
  tenant_id?: string;
}

interface BranchFormErrors {
  branch_name?: string;
  branch_number?: string;
  tenant_id?: string;
}

interface BranchUpsertModalProps {
  isOpen: boolean;
  isSuperAdmin: boolean;
  isEditing: boolean;
  formData: BranchFormState;
  formErrors: BranchFormErrors;
  tenants: Tenant[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onChange: (updater: (prev: BranchFormState) => BranchFormState) => void;
}

export function BranchUpsertModal({
  isOpen,
  isSuperAdmin,
  isEditing,
  formData,
  formErrors,
  tenants,
  isSubmitting,
  onClose,
  onSubmit,
  onChange,
}: BranchUpsertModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Sucursal" : "Nueva Sucursal"}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {isSuperAdmin && !isEditing && (
          <Select
            label="Empresa (Tenant)"
            value={formData.tenant_id || ""}
            onChange={(e) =>
              onChange((p) => ({ ...p, tenant_id: e.target.value }))
            }
            options={tenants.map((t) => ({
              value: t.tenant_id,
              label: t.tenant_name,
            }))}
            error={formErrors.tenant_id}
            required
          />
        )}

        <Input
          label="Nombre de Sucursal"
          placeholder="Ej: Sede Central, Sucursal 1"
          value={formData.branch_name}
          onChange={(e) =>
            onChange((p) => ({ ...p, branch_name: e.target.value }))
          }
          error={formErrors.branch_name}
          required
        />

        <Input
          label="Número de Sucursal"
          placeholder="Ej: 001, 002, 100"
          value={formData.branch_number}
          onChange={(e) =>
            onChange((p) => ({ ...p, branch_number: e.target.value }))
          }
          error={formErrors.branch_number}
          required={!isEditing}
          disabled={isEditing}
          hint={
            isEditing
              ? "No se puede cambiar el número de una sucursal existente"
              : undefined
          }
        />

        <Input
          label="Dirección"
          placeholder="Dirección completa de la sucursal"
          value={formData.branch_address}
          onChange={(e) =>
            onChange((p) => ({ ...p, branch_address: e.target.value }))
          }
        />

        {!isEditing && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
            <p className="font-semibold">Piso de venta automático</p>
            <p className="mt-1">
              Al crear esta sucursal se generará su piso de venta como almacén
              principal usando los datos ingresados arriba. Si necesitas bodegas
              auxiliares adicionales, regístralas más tarde desde el módulo de
              Almacenes.
            </p>
          </div>
        )}

        <div className="cursor-pointer flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="checkbox"
            id="is_main"
            checked={formData.is_main_branch}
            onChange={(e) =>
              onChange((p) => ({ ...p, is_main_branch: e.target.checked }))
            }
            className="rounded border-blue-300 text-blue-600"
          />
          <label
            htmlFor="is_main"
            className="text-sm font-medium text-blue-900 flex-1"
          >
            Marcar como sucursal principal
          </label>
        </div>

        {formData.is_main_branch && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Solo puede haber una sucursal principal por empresa. Si activas
            esto, la anterior será desactivada.
          </div>
        )}

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
            {isEditing ? "Guardar Cambios" : "Crear Sucursal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
