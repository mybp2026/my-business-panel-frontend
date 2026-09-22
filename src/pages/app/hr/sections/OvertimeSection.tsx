import { useEffect, useState } from "react";

import { overtimeApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { useHrEmployee } from "@/context/HrEmployeeContext";

import { IconCalendar, IconPlus } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrOvertimeKind,
  HrOvertimeRecord,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthAgoIso = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

const KIND_OPTIONS: { value: HrOvertimeKind; label: string }[] = [
  { value: "nocturna", label: "Bono nocturno (Art. 117)" },
  { value: "extra", label: "Hora extra (Art. 118)" },
  { value: "feriado", label: "Feriado trabajado (Art. 120)" },
  { value: "descanso", label: "Día de descanso trabajado (Art. 188)" },
];

const KIND_LABEL: Record<HrOvertimeKind, string> = {
  nocturna: "Nocturna",
  extra: "Extra",
  feriado: "Feriado",
  descanso: "Descanso",
};

export function OvertimeSection() {
  const { employeeId, selectedEmployee } = useHrEmployee();

  const [records, setRecords] = useState<HrOvertimeRecord[]>([]);
  const [accumulated, setAccumulated] = useState<{
    daily: {
      used: number;
      max: number;
      ordinaryHours: number;
      extraHours: number;
    };
    weekly: { used: number; max: number };
    yearly: { used: number; max: number };
  } | null>(null);

  const [from, setFrom] = useState(monthAgoIso());
  const [to, setTo] = useState(todayIso());

  const [form, setForm] = useState({
    work_date: todayIso(),
    kind: "extra" as HrOvertimeKind,
    hours: "",
    inspectoria_authorized: false,
    authorization_ref: "",
  });

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
      const [recordsResult, accResult] = await Promise.all([
        overtimeApi.listByEmployee(empId, from, to),
        overtimeApi.accumulated(empId, form.work_date),
      ]);
      setRecords(recordsResult);
      setAccumulated(accResult);
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
      setRecords([]);
      setAccumulated(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, from, to, form.work_date]);

  const handleCreate = async () => {
    if (!employeeId || !selectedEmployee) return;
    const hours = parseFloat(form.hours);
    if (!hours || hours <= 0) {
      setToast({
        mode: "error",
        message: "Ingresa una cantidad de horas válida",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await overtimeApi.create({
        employee_id: employeeId,
        branch_id: selectedEmployee.branch_id,
        work_date: form.work_date,
        kind: form.kind,
        hours,
        inspectoria_authorized:
          form.kind === "extra" ? form.inspectoria_authorized : undefined,
        authorization_ref: form.authorization_ref || undefined,
      });
      setForm((p) => ({ ...p, hours: "", authorization_ref: "" }));
      await reload(employeeId);
      setToast({ mode: "success", message: "Horas registradas correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error registrando las horas",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "work_date",
      label: "Fecha",
      width: "18%",
      render: (value: string) => value.slice(0, 10),
    },
    {
      key: "kind",
      label: "Tipo",
      width: "18%",
      render: (value: HrOvertimeKind) => (
        <Badge variant={value === "extra" ? "yellow" : "blue"}>
          {KIND_LABEL[value]}
        </Badge>
      ),
    },
    {
      key: "hours",
      label: "Horas",
      width: "16%",
      render: (value: number | string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      key: "rate_factor",
      label: "Factor",
      width: "16%",
      render: (value: number | string) => (
        <span className="font-mono">{Number(value).toFixed(2)}x</span>
      ),
    },
    {
      key: "inspectoria_authorized",
      label: "Autorizado",
      width: "16%",
      render: (value: boolean, row: HrOvertimeRecord) =>
        row.kind === "extra" ? (
          <Badge variant={value ? "green" : "red"}>{value ? "Sí" : "No"}</Badge>
        ) : (
          "—"
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

      {accumulated && (
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <StatCard
            label="Total del día (jornada + extra)"
            value={`${accumulated.daily.used} / ${accumulated.daily.max} h`}
            sublabel={`${form.work_date}: ${accumulated.daily.ordinaryHours}h jornada + ${accumulated.daily.extraHours}h extra (Art. 178)`}
            icon={<IconCalendar />}
          />
          <StatCard
            label="Horas extra semana"
            value={`${accumulated.weekly.used} / ${accumulated.weekly.max} h`}
            sublabel={`Semana de ${form.work_date}`}
            icon={<IconCalendar />}
          />
          <StatCard
            label="Horas extra año"
            value={`${accumulated.yearly.used} / ${accumulated.yearly.max} h`}
            sublabel={form.work_date.slice(0, 4)}
            icon={<IconCalendar />}
          />
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Registrar horas
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            label="Fecha"
            type="date"
            value={form.work_date}
            onChange={(e) =>
              setForm((p) => ({ ...p, work_date: e.target.value }))
            }
            required
          />
          <Select
            label="Tipo"
            value={form.kind}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                kind: e.target.value as HrOvertimeKind,
              }))
            }
            options={KIND_OPTIONS}
          />
          <Input
            label="Horas"
            type="number"
            step="0.25"
            value={form.hours}
            onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
            required
          />
          {form.kind === "extra" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">
                Autorización de Inspectoría
              </span>
              <span className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-accent-white px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={form.inspectoria_authorized}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      inspectoria_authorized: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 shrink-0 cursor-pointer"
                />
                <span className="text-sm text-gray-700">
                  {form.inspectoria_authorized
                    ? "Autorizada"
                    : "Sin autorizar (recargo se duplica, Art. 182)"}
                </span>
              </span>
            </label>
          )}
        </div>
        <p className="mt-4 text-sm text-gray-500">
          El tope diario del Art. 178 (10h) es la jornada ordinaria mas las
          horas extra registradas ese dia — no solo las extras.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleCreate} loading={isSubmitting}>
            <IconPlus />
            Registrar horas
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          Historial de recargos
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Solo horas CON recargo (nocturna, extra, feriado, descanso) — la
          jornada ordinaria no aparece aqui aunque si cuenta para el tope
          diario de arriba.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Desde"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Table
          columns={columns}
          data={records}
          isLoading={isLoading}
          emptyMessage="No hay registros en el periodo seleccionado."
        />
      </div>
    </>
  );
}
