import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Branch } from "@/interfaces/entities/Branch.interface";

export function BranchDetailModal({
  branch,
  onClose,
}: {
  branch: Branch;
  onClose: () => void;
}) {
  const field = (label: string, value?: string | number | boolean | null) => {
    let display: string;
    if (typeof value === "boolean") display = value ? "Sí" : "No";
    else display = value != null ? String(value) : "—";
    return (
      <div key={label}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-sm text-gray-900">{display}</p>
      </div>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title="Detalle de Sucursal" size="md">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Sucursal
          </p>
          <div className="grid grid-cols-2 gap-4">
            {field("Nombre", branch.branch_name)}
            {field("Número", branch.branch_number)}
            {field("Principal", branch.is_main_branch)}
            {field("Dirección", branch.branch_address)}
          </div>
        </div>

        {(branch as any).tenant_name && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Empresa
            </p>
            {field("Tenant", (branch as any).tenant_name)}
          </div>
        )}

        {branch.created_at && (
          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {field(
                "Creado",
                new Date(branch.created_at).toLocaleString("es-CR"),
              )}
              {branch.updated_at &&
                field(
                  "Actualizado",
                  new Date(branch.updated_at).toLocaleString("es-CR"),
                )}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
