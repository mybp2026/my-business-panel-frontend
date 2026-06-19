import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import { paysheetApi } from "@/api/paysheet.api";
import { payrollMovementApi } from "@/api/payrollMovement.api";

import type {
  HrEmployeeRecord,
  HrPaysheet,
  HrPaysheetDetail,
  HrPayrollMovement,
} from "@/interfaces/entities/Hr.interface";

interface PaysheetDetailModalProps {
  isOpen: boolean;
  paysheet: HrPaysheet | null;
  employees: HrEmployeeRecord[];
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  `CRC ${Number(value).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (raw: string) => {
  const d = raw.slice(0, 10);
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export function PaysheetDetailModal({
  isOpen,
  paysheet,
  employees,
  onClose,
}: PaysheetDetailModalProps) {
  const [details, setDetails] = useState<HrPaysheetDetail[]>([]);
  const [movements, setMovements] = useState<HrPayrollMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen || !paysheet) {
      setDetails([]);
      setMovements([]);
      setExpandedEmployeeId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    Promise.all([
      paysheetApi.getDetails(paysheet.paysheet_id),
      payrollMovementApi.listByPaysheet(paysheet.paysheet_id),
    ])
      .then(([nextDetails, nextMovements]) => {
        setDetails(nextDetails);
        setMovements(nextMovements);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, paysheet]);

  const employeeMap = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.employee_id,
          `${employee.first_name} ${employee.last_name}`,
        ]),
      ),
    [employees],
  );

  // Movimientos agrupados por empleado
  const movementsByEmployee = useMemo(() => {
    const map = new Map<string, HrPayrollMovement[]>();
    for (const movement of movements) {
      const list = map.get(movement.employee_id) ?? [];
      list.push(movement);
      map.set(movement.employee_id, list);
    }
    return map;
  }, [movements]);

  const toggleEmployee = (employeeId: string) =>
    setExpandedEmployeeId((current) =>
      current === employeeId ? null : employeeId,
    );

  const renderMovementRows = (rows: HrPayrollMovement[]) => {
    if (!rows.length) {
      return <p className="text-sm text-gray-400">Sin movimientos.</p>;
    }

    return (
      <div className="space-y-2">
        {rows.map((movement) => (
          <div
            key={movement.movement_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  movement.concept_type === "earning" ? "green" : "secondary"
                }
              >
                {movement.concept_type === "earning" ? "Ingreso" : "Deducción"}
              </Badge>
              <span className="text-sm font-medium text-gray-900">
                {movement.concept_name}
              </span>
            </div>
            <div className="text-right text-sm">
              <span className="font-semibold text-gray-900">
                {formatCurrency(Number(movement.calculated_amount))}
              </span>
              <span className="ml-2 text-xs text-gray-400">
                base {formatCurrency(Number(movement.base_amount))}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de nómina" size="lg">
      {paysheet && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <Badge variant={paysheet.status_id === 2 ? "green" : "secondary"}>
              {paysheet.status_id === 2 ? "Procesada" : "Pendiente"}
            </Badge>
            <p className="text-sm text-gray-600">
              Periodo {formatDate(paysheet.period_start)} al{" "}
              {formatDate(paysheet.period_end)}
            </p>
            <p className="ml-auto text-sm text-gray-600">
              {details.length} empleado(s) ·{" "}
              <span className="font-semibold text-gray-900">
                Neto {formatCurrency(Number(paysheet.net_total))}
              </span>
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Empleados beneficiados
            </h3>

            {isLoading ? (
              <p className="text-sm text-gray-500">Cargando detalles…</p>
            ) : details.length === 0 ? (
              <p className="text-sm text-gray-400">
                Esta nómina todavía no tiene detalles generados.
              </p>
            ) : (
              <div className="space-y-3">
                {details.map((detail) => {
                  const isExpanded =
                    expandedEmployeeId === detail.employee_id;
                  const empMovements =
                    movementsByEmployee.get(detail.employee_id) ?? [];
                  const earnings = empMovements.filter(
                    (m) => m.concept_type === "earning",
                  );
                  const deductions = empMovements.filter(
                    (m) => m.concept_type === "deduction",
                  );

                  return (
                    <div
                      key={detail.detail_id}
                      className="rounded-xl border border-gray-200"
                    >
                      <button
                        type="button"
                        onClick={() => toggleEmployee(detail.employee_id)}
                        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {employeeMap.get(detail.employee_id) ??
                              detail.employee_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            Bruto {formatCurrency(Number(detail.gross_salary))} ·
                            Ingresos{" "}
                            {formatCurrency(Number(detail.total_earnings))} ·
                            Deducciones{" "}
                            {formatCurrency(Number(detail.total_deduction))}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900">
                            Neto {formatCurrency(Number(detail.net_salary))}
                          </span>
                          <span className="text-xs font-medium text-accent-600">
                            {isExpanded ? "Ocultar" : "Ver conceptos"}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-4 border-t border-gray-200 bg-gray-50 px-4 py-4">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Ingresos (bonos, comisiones, extras)
                            </p>
                            {renderMovementRows(earnings)}
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Deducciones
                            </p>
                            {renderMovementRows(deductions)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
