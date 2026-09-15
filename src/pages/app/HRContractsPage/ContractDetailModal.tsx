import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

import type {
  HrEmployeeRecord,
  HrTurn,
} from "@/interfaces/entities/Hr.interface";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-VE");
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-VE", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      });
};

const formatCurrency = (value?: number | string | null) => {
  if (value == null || value === "") return "—";
  return `Bs. ${Number(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function ContractDetailModal({
  contract,
  turns,
  onClose,
}: {
  contract: HrEmployeeRecord;
  turns: HrTurn[];
  onClose: () => void;
}) {
  const field = (label: string, value?: string | number | null) => (
    <div key={label}>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-sm text-gray-900">
        {value != null && value !== "" ? String(value) : "—"}
      </p>
    </div>
  );

  const turn = turns.find((item) => item.turn_id === contract.turn_id);
  const turnLabel = turn
    ? `${turn.entry.slice(0, 5)} - ${turn.out.slice(0, 5)}`
    : contract.turn_id != null
      ? `Turno ${contract.turn_id}`
      : "—";

  return (
    <Modal isOpen onClose={onClose} title="Detalle de Contrato" size="md">
      <div className="space-y-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Contrato
          </p>
          <div className="grid grid-cols-2 gap-4">
            {field("Contract ID", contract.contract_id)}
            {field("Tenant ID", contract.tenant_id)}
            {field("Fecha de inicio", formatDate(contract.start_date))}
            {field("Fecha de fin", formatDate(contract.end_date))}
            {field("Horas", contract.hours)}
            {field("Salario base", formatCurrency(contract.base_salary))}
            {field("ID de tipo de cargo", contract.duties_type_id)}
            {field("Tipo de turno", contract.turn_type)}
            {field("Turno", turnLabel)}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Funciones
          </p>
          <div className="grid grid-cols-1 gap-4">
            {field("Cargo", contract.duties_type_name ?? contract.duties)}
            <div>
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                Descripción del cargo
              </p>
              <div className="min-h-24 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-900 whitespace-pre-wrap break-words">
                {contract.duties_type_description?.trim() || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Relación del empleado
          </p>
          <div className="grid grid-cols-2 gap-4">
            {field("Empleado", `${contract.first_name} ${contract.last_name}`)}
            {field("Employee ID", contract.employee_id)}
            {field("Sucursal", contract.branch_name)}
            {field("Branch ID", contract.branch_id)}
            {field("Activo", contract.is_active ? "Sí" : "No")}
            {field("Usuario asociado", contract.user_id)}
            {field("Creado", formatDateTime(contract.created_at))}
            {field("Actualizado", formatDateTime(contract.updated_at))}
          </div>
        </div>

        <div className="pt-2">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
