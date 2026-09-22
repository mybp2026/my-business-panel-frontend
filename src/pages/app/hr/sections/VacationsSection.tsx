import { useEffect, useState } from "react";

import { hrVacationsApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { useHrEmployee } from "@/context/HrEmployeeContext";

import { IconCalendar } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrVacationEntitlement,
  HrVacationPeriod,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatDays = (value: number | string) =>
  Number(value).toLocaleString("es-VE", { maximumFractionDigits: 2 });

const formatAmount = (value: number | string | null) =>
  value === null
    ? "—"
    : Number(value).toLocaleString("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const STATUS_VARIANT: Record<
  HrVacationPeriod["status"],
  "gray" | "yellow" | "blue" | "green"
> = {
  causado: "gray",
  disfrutando: "yellow",
  disfrutado: "blue",
  pagado: "green",
};

const STATUS_LABEL: Record<HrVacationPeriod["status"], string> = {
  causado: "Causado",
  disfrutando: "Disfrutando",
  disfrutado: "Disfrutado",
  pagado: "Pagado",
};

export function VacationsSection() {
  const { employeeId } = useHrEmployee();

  const [entitlement, setEntitlement] = useState<HrVacationEntitlement | null>(
    null,
  );
  const [periods, setPeriods] = useState<HrVacationPeriod[]>([]);
  const [untilDate, setUntilDate] = useState(todayIso());
  const [enjoyForm, setEnjoyForm] = useState<{
    periodId: string;
    from: string;
    to: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const reload = async (empId: string) => {
    if (!empId) return;
    setIsLoading(true);
    try {
      const [entitlementResult, periodsResult] = await Promise.all([
        hrVacationsApi.entitlementByEmployee(empId),
        hrVacationsApi.listByEmployee(empId),
      ]);
      setEntitlement(entitlementResult);
      setPeriods(periodsResult);
    } catch (error) {
      setToast({
        mode: "error",
        message: error instanceof Error ? error.message : "Error cargando datos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) reload(employeeId);
    else {
      setEntitlement(null);
      setPeriods([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleGeneratePeriods = async () => {
    if (!employeeId) return;
    setIsSubmitting(true);
    try {
      await hrVacationsApi.generatePeriods(employeeId, untilDate);
      await reload(employeeId);
      setToast({
        mode: "success",
        message: "Periodos generados correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error generando periodos",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnjoy = async () => {
    if (!enjoyForm) return;
    setIsSubmitting(true);
    try {
      await hrVacationsApi.enjoy(enjoyForm.periodId, {
        enjoyed_from: enjoyForm.from,
        enjoyed_to: enjoyForm.to,
      });
      setEnjoyForm(null);
      await reload(employeeId);
      setToast({
        mode: "success",
        message: "Disfrute registrado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error registrando disfrute",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayBonus = async (periodId: string) => {
    setIsSubmitting(true);
    try {
      await hrVacationsApi.payBonus(periodId, { paid_at: todayIso() });
      await reload(employeeId);
      setToast({ mode: "success", message: "Bono vacacional pagado" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error pagando bono vacacional",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column[] = [
    { key: "service_year", label: "Año", width: "10%" },
    {
      key: "period_start",
      label: "Periodo",
      width: "20%",
      render: (_v: unknown, row: HrVacationPeriod) =>
        `${row.period_start.slice(0, 10)} — ${row.period_end.slice(0, 10)}`,
    },
    {
      key: "days_earned",
      label: "Días",
      width: "10%",
      render: (value: number | string) => (
        <span className="font-mono">{formatDays(value)}</span>
      ),
    },
    {
      key: "bonus_days_earned",
      label: "Bono",
      width: "10%",
      render: (value: number | string) => (
        <span className="font-mono">{formatDays(value)}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      width: "14%",
      render: (value: HrVacationPeriod["status"]) => (
        <Badge variant={STATUS_VARIANT[value]}>{STATUS_LABEL[value]}</Badge>
      ),
    },
    {
      key: "paid_amount",
      label: "Monto pagado",
      width: "14%",
      render: (value: number | string | null) => (
        <span className="font-mono">{formatAmount(value)}</span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "22%",
      render: (_v: unknown, row: HrVacationPeriod) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {row.status === "causado" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setEnjoyForm({
                  periodId: row.vacation_period_id,
                  from: todayIso(),
                  to: todayIso(),
                })
              }
            >
              Disfrutar
            </Button>
          )}
          {!row.bonus_paid_amount && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handlePayBonus(row.vacation_period_id)}
              loading={isSubmitting}
            >
              Pagar bono
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {entitlement && (
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <StatCard
            label="Días de vacaciones (Art. 190)"
            value={entitlement.vacationDays ?? "—"}
            icon={<IconCalendar />}
            accent
          />
          <StatCard
            label="Días de bono vacacional (Art. 192)"
            value={entitlement.bonusVacationDays ?? "—"}
            icon={<IconCalendar />}
          />
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <div className="flex flex-wrap items-end gap-4">
          <Input
            label="Generar periodos hasta"
            type="date"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
          />
          <Button
            onClick={handleGeneratePeriods}
            loading={isSubmitting}
            variant="secondary"
          >
            Generar periodos
          </Button>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Sin periodos generados, la Liquidacion final no puede incluir las
          vacaciones ni el bono causados de este trabajador.
        </p>
      </div>

      {enjoyForm && (
        <div className="mb-6 max-w-xl rounded-2xl border border-gray-300 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Registrar disfrute de vacaciones
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Desde"
              type="date"
              value={enjoyForm.from}
              onChange={(e) =>
                setEnjoyForm((p) => (p ? { ...p, from: e.target.value } : p))
              }
            />
            <Input
              label="Hasta"
              type="date"
              value={enjoyForm.to}
              onChange={(e) =>
                setEnjoyForm((p) => (p ? { ...p, to: e.target.value } : p))
              }
            />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEnjoyForm(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEnjoy} loading={isSubmitting}>
              Confirmar disfrute
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <Table
          columns={columns}
          data={periods}
          isLoading={isLoading}
          emptyMessage="No hay periodos generados todavía."
        />
      </div>
    </>
  );
}
