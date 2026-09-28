import { useMemo } from "react";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";

import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";

import type {
  HrEmployeeRecord,
  HrPayrollConcept,
  HrPaysheet,
} from "@/interfaces/entities/Hr.interface";

interface PayrollConfirmModalProps {
  isOpen: boolean;
  paysheet: HrPaysheet | null;
  employees: HrEmployeeRecord[];
  concepts: HrPayrollConcept[];
  isProcessing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const formatDate = (raw: string) => {
  const d = raw.slice(0, 10);
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

interface EmployeeProjection {
  employee: HrEmployeeRecord;
  base: number;
  extraEarnings: number;
  deductions: number;
  estimatedNet: number;
  hasVariable: boolean;
}

function projectEmployee(
  emp: HrEmployeeRecord,
  activeConcepts: HrPayrollConcept[],
): EmployeeProjection {
  const base = Number(emp.base_salary);
  let extraEarnings = 0;
  let deductions = 0;
  let hasVariable = false;

  for (const c of activeConcepts) {
    const v = Number(c.base_value);
    if (c.calculation_method === "fixed") {
      if (c.type === "earning") extraEarnings += v;
      else deductions += v;
    } else if (c.calculation_method === "percentage") {
      // base_value stored as fraction (0.1067 = 10.67%)
      const amt = base * v;
      if (c.type === "earning") extraEarnings += amt;
      else deductions += amt;
    } else {
      // formula or manual — depends on clocking/manual input
      hasVariable = true;
    }
  }

  return {
    employee: emp,
    base,
    extraEarnings,
    deductions,
    estimatedNet: base + extraEarnings - deductions,
    hasVariable,
  };
}

export function PayrollConfirmModal({
  isOpen,
  paysheet,
  employees,
  concepts,
  isProcessing,
  onConfirm,
  onClose,
}: PayrollConfirmModalProps) {
  const rate = useCurrentExchangeRate();

  const activeConcepts = useMemo(
    () => concepts.filter((c) => c.is_active !== false),
    [concepts],
  );

  const projections = useMemo(() => {
    if (!paysheet) return [];
    return employees
      .filter((e) => e.branch_id === paysheet.branch_id && e.is_active)
      .map((e) => projectEmployee(e, activeConcepts));
  }, [employees, paysheet, activeConcepts]);

  const totals = useMemo(() => {
    return projections.reduce(
      (acc, p) => ({
        base: acc.base + p.base,
        earnings: acc.earnings + p.extraEarnings,
        deductions: acc.deductions + p.deductions,
        net: acc.net + p.estimatedNet,
      }),
      { base: 0, earnings: 0, deductions: 0, net: 0 },
    );
  }, [projections]);

  const hasAnyVariable = projections.some((p) => p.hasVariable);

  if (!paysheet) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar procesamiento de nómina"
      size="lg"
    >
      <div className="space-y-5">
        {/* Periodo */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Periodo{" "}
          <span className="font-semibold text-gray-900">
            {formatDate(paysheet.period_start)}
          </span>{" "}
          al{" "}
          <span className="font-semibold text-gray-900">
            {formatDate(paysheet.period_end)}
          </span>
        </div>

        {/* Empleados con proyección */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">
            Empleados beneficiados ({projections.length})
          </p>

          {projections.length === 0 ? (
            <p className="text-sm text-red-600">
              No hay empleados activos con contrato en esta sucursal. La nómina
              no podrá procesarse.
            </p>
          ) : (
            <div className="space-y-2">
              {projections.map((p) => (
                <div
                  key={p.employee.employee_id}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {p.employee.first_name} {p.employee.last_name}
                    </p>
                    <div className="text-right">
                      <DualCurrencyAmount
                        amountBs={p.estimatedNet}
                        rate={rate}
                        bold
                        className="inline-block"
                      />
                      {p.hasVariable && (
                        <span className="ml-1 text-xs text-amber-600">
                          + variables
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-gray-500">
                    Base{" "}
                    <DualCurrencyAmount
                      amountBs={p.base}
                      rate={rate}
                      hideSecondary
                      className="inline-block"
                    />{" "}
                    · Ingresos fijos{" "}
                    <DualCurrencyAmount
                      amountBs={p.extraEarnings}
                      rate={rate}
                      hideSecondary
                      className="inline-block"
                    />{" "}
                    · Deducciones{" "}
                    <DualCurrencyAmount
                      amountBs={p.deductions}
                      rate={rate}
                      hideSecondary
                      className="inline-block"
                    />
                    {p.hasVariable && (
                      <span className="ml-1 text-amber-600">
                        · conceptos variables (horas extra, ISR, etc.) se
                        calculan al procesar
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totales estimados */}
        {projections.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Estimado total
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-gray-600">
                Base{" "}
                <DualCurrencyAmount
                  amountBs={totals.base}
                  rate={rate}
                  bold
                  hideSecondary
                  className="inline-block"
                />
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                Ingresos fijos{" "}
                <span className="font-semibold text-emerald-700">+</span>
                <DualCurrencyAmount
                  amountBs={totals.earnings}
                  rate={rate}
                  bold
                  hideSecondary
                  className="inline-block"
                  amountClassName="font-semibold text-emerald-700"
                />
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                Deducciones{" "}
                <span className="font-semibold text-red-600">-</span>
                <DualCurrencyAmount
                  amountBs={totals.deductions}
                  rate={rate}
                  bold
                  hideSecondary
                  className="inline-block"
                  amountClassName="font-semibold text-red-600"
                />
              </span>
              <span className="ml-auto flex items-center gap-1 font-bold text-gray-900">
                Neto est.{" "}
                <DualCurrencyAmount
                  amountBs={totals.net}
                  rate={rate}
                  className="inline-block"
                />
              </span>
            </div>
            {hasAnyVariable && (
              <p className="mt-2 text-xs text-amber-600">
                Los montos con conceptos variables (horas extra, vacaciones,
                aguinaldo, ISR) varían según marcadores y datos del periodo.
              </p>
            )}
          </div>
        )}

        {/* Conceptos activos */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">
            Conceptos activos ({activeConcepts.length})
          </p>
          {activeConcepts.length === 0 ? (
            <p className="text-sm text-amber-600">
              Sin conceptos activos. Configure al menos uno antes de procesar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeConcepts.map((c) => (
                <Badge
                  key={c.concept_id}
                  variant={c.type === "earning" ? "green" : "secondary"}
                >
                  {c.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            loading={isProcessing}
            disabled={
              projections.length === 0 || activeConcepts.length === 0
            }
          >
            Procesar nómina
          </Button>
        </div>
      </div>
    </Modal>
  );
}
