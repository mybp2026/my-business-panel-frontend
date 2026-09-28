import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { foulApi } from "@/api/foul.api";
import { suspentionApi } from "@/api/suspention.api";
import { tardinessApi } from "@/api/tardiness.api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import { IconCalendar, IconEdit, IconShield, IconUsers } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrFoulRecord,
  HrSuspention,
  HrTardinessRecord,
  UpdateHrSuspentionPayload,
} from "@/interfaces/entities/Hr.interface";
import type { HrAmonestacionesPageLoaderData } from "@/router/loaders/hr.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { SuspentionEditorModal } from "./SuspentionEditorModal";

type ScopeMode = "branch" | "employee" | "period";

export function HRAmonestacionesPage() {
  const { data } = useLoaderData() as {
    data: Promise<HrAmonestacionesPageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {(resolved) => <HRAmonestacionesPageContent {...resolved} />}
    </DeferredPage>
  );
}

function HRAmonestacionesPageContent({
  branches,
  employees,
}: HrAmonestacionesPageLoaderData) {
  const [selectedBranchId, setSelectedBranchId] = useState(
    branches[0]?.branch_id ?? "",
  );
  const [scope, setScope] = useState<ScopeMode>("branch");
  const [scopeEmployeeId, setScopeEmployeeId] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);

  const [tardiness, setTardiness] = useState<HrTardinessRecord[]>([]);
  const [tardinessTotal, setTardinessTotal] = useState(0);
  const [fouls, setFouls] = useState<HrFoulRecord[]>([]);
  const [foulTotal, setFoulTotal] = useState(0);
  const [suspentions, setSuspentions] = useState<HrSuspention[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  const [foulEmployeeId, setFoulEmployeeId] = useState("");
  const [foulDate, setFoulDate] = useState(today);
  const [foulHour, setFoulHour] = useState("08:00");
  const [foulDescription, setFoulDescription] = useState("");
  const [isSubmittingFoul, setIsSubmittingFoul] = useState(false);

  const [suspentionEmployeeId, setSuspentionEmployeeId] = useState("");
  const [suspentionStart, setSuspentionStart] = useState(today);
  const [suspentionEnd, setSuspentionEnd] = useState(today);
  const [suspentionReason, setSuspentionReason] = useState("");
  const [isSubmittingSuspention, setIsSubmittingSuspention] = useState(false);

  const [editingSuspention, setEditingSuspention] =
    useState<HrSuspention | null>(null);
  const [suspentionModalOpen, setSuspentionModalOpen] = useState(false);

  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const branchName = branches.find(
    (branch) => branch.branch_id === selectedBranchId,
  )?.branch_name;

  const branchEmployees = useMemo(
    () =>
      employees.filter((employee) => employee.branch_id === selectedBranchId),
    [employees, selectedBranchId],
  );

  const employeeOptions = branchEmployees.map((employee) => ({
    value: employee.employee_id,
    label: `${employee.first_name} ${employee.last_name}`,
  }));

  const loadRecords = async () => {
    if (!selectedBranchId) return;

    setIsLoadingRecords(true);

    try {
      if (scope === "employee") {
        if (!scopeEmployeeId) {
          setTardiness([]);
          setTardinessTotal(0);
          setFouls([]);
          setFoulTotal(0);
          setSuspentions([]);
          return;
        }

        const [tardinessSummary, foulSummary, employeeSuspentions] =
          await Promise.all([
            tardinessApi.getByEmployee(scopeEmployeeId),
            foulApi.getByEmployee(scopeEmployeeId),
            suspentionApi.getByEmployee(scopeEmployeeId),
          ]);

        setTardiness(tardinessSummary.tardiness ?? []);
        setTardinessTotal(Number(tardinessSummary.totalCount ?? 0));
        setFouls(foulSummary.fouls ?? []);
        setFoulTotal(Number(foulSummary.totalFouls ?? 0));
        setSuspentions(employeeSuspentions);
      } else if (scope === "period") {
        if (!periodStart || !periodEnd) {
          return;
        }

        const [tardinessSummary, foulRecords, branchSuspentions] =
          await Promise.all([
            tardinessApi.getByPeriod(periodStart, periodEnd, selectedBranchId),
            foulApi.getByPeriod(periodStart, periodEnd),
            suspentionApi.getByBranch(selectedBranchId),
          ]);

        setTardiness(tardinessSummary.tardiness ?? []);
        setTardinessTotal(Number(tardinessSummary.totalCount ?? 0));
        setFouls(
          foulRecords.filter(
            (record) =>
              record.branch_id === selectedBranchId || !record.branch_id,
          ),
        );
        setFoulTotal(foulRecords.length);
        setSuspentions(branchSuspentions);
      } else {
        const [tardinessSummary, foulSummary, branchSuspentions] =
          await Promise.all([
            tardinessApi.getByBranch(selectedBranchId),
            foulApi.getByBranch(selectedBranchId),
            suspentionApi.getByBranch(selectedBranchId),
          ]);

        setTardiness(tardinessSummary.tardiness ?? []);
        setTardinessTotal(Number(tardinessSummary.totalCount ?? 0));
        setFouls(foulSummary.fouls ?? []);
        setFoulTotal(Number(foulSummary.totalFouls ?? 0));
        setSuspentions(branchSuspentions);
      }
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las amonestaciones",
      });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [selectedBranchId, scope, scopeEmployeeId, periodStart, periodEnd]);

  useEffect(() => {
    if (!branchEmployees.length) {
      setFoulEmployeeId("");
      setSuspentionEmployeeId("");
      setScopeEmployeeId("");
      return;
    }

    if (
      !branchEmployees.some(
        (employee) => employee.employee_id === foulEmployeeId,
      )
    ) {
      setFoulEmployeeId(branchEmployees[0].employee_id);
    }

    if (
      !branchEmployees.some(
        (employee) => employee.employee_id === suspentionEmployeeId,
      )
    ) {
      setSuspentionEmployeeId(branchEmployees[0].employee_id);
    }

    if (
      !branchEmployees.some(
        (employee) => employee.employee_id === scopeEmployeeId,
      )
    ) {
      setScopeEmployeeId(branchEmployees[0].employee_id);
    }
  }, [branchEmployees, foulEmployeeId, scopeEmployeeId, suspentionEmployeeId]);

  const handleRegisterFoul = async () => {
    if (!selectedBranchId || !foulEmployeeId || !foulDescription.trim()) {
      setToast({
        mode: "error",
        message: "Complete empleado, fecha, hora y descripción de la falta",
      });
      return;
    }

    setIsSubmittingFoul(true);

    try {
      await foulApi.create({
        employee_id: foulEmployeeId,
        branch_id: selectedBranchId,
        identificator: `F-${foulEmployeeId.slice(0, 8)}-${Date.now()}`,
        foul_date: foulDate,
        foul_hour: foulHour,
        description: foulDescription.trim(),
      });
      await loadRecords();
      setFoulDescription("");
      setToast({
        mode: "success",
        message: "Falta registrada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la falta",
      });
    } finally {
      setIsSubmittingFoul(false);
    }
  };

  const handleRegisterSuspention = async () => {
    if (
      !selectedBranchId ||
      !suspentionEmployeeId ||
      !suspentionReason.trim() ||
      !suspentionStart ||
      !suspentionEnd
    ) {
      setToast({
        mode: "error",
        message: "Complete los datos de suspensión",
      });
      return;
    }

    setIsSubmittingSuspention(true);

    try {
      await suspentionApi.create({
        employee_id: suspentionEmployeeId,
        branchId: selectedBranchId,
        suspentionStart: suspentionStart,
        suspentionEnd: suspentionEnd,
        reason: suspentionReason.trim(),
      });
      await loadRecords();
      setSuspentionReason("");
      setToast({
        mode: "success",
        message: "Suspensión registrada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la suspensión",
      });
    } finally {
      setIsSubmittingSuspention(false);
    }
  };

  const handleCloseSuspention = async (suspentionId: number) => {
    try {
      await suspentionApi.close(suspentionId);
      await loadRecords();
      setToast({
        mode: "success",
        message: "Suspensión cerrada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cerrar la suspensión",
      });
    }
  };

  const handleEditSuspention = (suspention: HrSuspention) => {
    setEditingSuspention(suspention);
    setSuspentionModalOpen(true);
  };

  const handleSubmitEditSuspention = async (
    payload: UpdateHrSuspentionPayload,
  ) => {
    if (!editingSuspention) return;

    try {
      await suspentionApi.update(editingSuspention.suspention_id, payload);
      await loadRecords();
      setToast({
        mode: "success",
        message: "Suspensión actualizada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la suspensión",
      });
      throw error;
    }
  };

  const tardinessColumns: Column[] = [
    {
      key: "type",
      label: "Tipo",
      width: "18%",
      render: (value: string) => (
        <Badge variant={value === "late" ? "yellow" : "secondary"}>
          {value === "late" ? "Tardanza" : "Salida temprana"}
        </Badge>
      ),
    },
    { key: "registered_at", label: "Fecha", width: "22%" },
    { key: "log", label: "Registro", width: "60%" },
  ];

  const foulColumns: Column[] = [
    { key: "identificator", label: "ID", width: "20%" },
    { key: "foul_date", label: "Fecha", width: "18%" },
    { key: "foul_hour", label: "Hora", width: "14%" },
    { key: "description", label: "Descripción", width: "48%" },
  ];

  const suspentionColumns: Column[] = [
    { key: "suspention_start", label: "Inicio", width: "16%" },
    { key: "suspention_end", label: "Fin", width: "16%" },
    { key: "reason", label: "Motivo", width: "38%" },
    {
      key: "is_active",
      label: "Estado",
      width: "12%",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "secondary"}>
          {value ? "Activa" : "Cerrada"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "18%",
      render: (_value: unknown, row: HrSuspention) => (
        <div
          className="flex gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!row.is_active}
            onClick={() => handleEditSuspention(row)}
          >
            <IconEdit />
          </Button>
          <Button
            type="button"
            variant="warning"
            size="sm"
            disabled={!row.is_active}
            onClick={() => handleCloseSuspention(row.suspention_id)}
          >
            Cerrar
          </Button>
        </div>
      ),
    },
  ];

  const activeSuspentionsCount = suspentions.filter((s) => s.is_active).length;

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeaderBanner
        eyebrow="HR"
        title="Amonestaciones"
        description="Gestione tardanzas, faltas y suspensiones que afectan la nómina y la conducta de los empleados."
      />

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Select
            label="Sucursal"
            value={selectedBranchId}
            onChange={(event) => setSelectedBranchId(event.target.value)}
            options={branches.map((branch) => ({
              value: branch.branch_id,
              label: branch.branch_name,
            }))}
          />
          <Select
            label="Filtro"
            value={scope}
            onChange={(event) => setScope(event.target.value as ScopeMode)}
            options={[
              { value: "branch", label: "Por sucursal (30 días)" },
              { value: "employee", label: "Por empleado (30 días)" },
              { value: "period", label: "Por periodo" },
            ]}
          />
          {scope === "employee" && (
            <Select
              label="Empleado"
              value={scopeEmployeeId}
              onChange={(event) => setScopeEmployeeId(event.target.value)}
              options={employeeOptions}
            />
          )}
          {scope === "period" && (
            <>
              <Input
                label="Inicio"
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
              <Input
                label="Fin"
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
              />
            </>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard
          label="Tardanzas"
          value={tardinessTotal}
          sublabel={branchName}
          icon={<IconCalendar />}
          accent
        />
        <StatCard
          label="Faltas"
          value={foulTotal}
          sublabel={branchName}
          icon={<IconUsers />}
        />
        <StatCard
          label="Suspensiones activas"
          value={activeSuspentionsCount}
          sublabel={`${suspentions.length} totales`}
          icon={<IconShield />}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-300 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Registrar falta
            </h2>
            <p className="text-sm text-gray-500">
              Estas faltas alimentan deducciones y reportes de conducta.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Empleado"
              value={foulEmployeeId}
              onChange={(event) => setFoulEmployeeId(event.target.value)}
              options={employeeOptions}
            />
            <Input
              label="Fecha"
              type="date"
              value={foulDate}
              onChange={(event) => setFoulDate(event.target.value)}
            />
            <Input
              label="Hora"
              type="time"
              value={foulHour}
              onChange={(event) => setFoulHour(event.target.value)}
            />
            <Input
              label="Descripción"
              value={foulDescription}
              onChange={(event) => setFoulDescription(event.target.value)}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button loading={isSubmittingFoul} onClick={handleRegisterFoul}>
              Registrar falta
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tardanzas</h2>
            <p className="text-sm text-gray-500">
              Se generan automáticamente cuando el clocking cae fuera del turno.
            </p>
          </div>

          <Table
            columns={tardinessColumns}
            data={tardiness}
            isLoading={isLoadingRecords}
            emptyMessage="No hay tardanzas registradas"
          />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Faltas</h2>
          <p className="text-sm text-gray-500">
            Historial reciente de faltas registradas manualmente.
          </p>
        </div>

        <Table
          columns={foulColumns}
          data={fouls}
          isLoading={isLoadingRecords}
          emptyMessage="No hay faltas registradas"
        />
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Suspensiones</h2>
          <p className="text-sm text-gray-500">
            Registre periodos de suspensión que afecten pagos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Empleado"
            value={suspentionEmployeeId}
            onChange={(event) => setSuspentionEmployeeId(event.target.value)}
            options={employeeOptions}
          />
          <Input
            label="Motivo"
            value={suspentionReason}
            onChange={(event) => setSuspentionReason(event.target.value)}
          />
          <Input
            label="Inicio"
            type="date"
            value={suspentionStart}
            onChange={(event) => setSuspentionStart(event.target.value)}
          />
          <Input
            label="Fin"
            type="date"
            value={suspentionEnd}
            onChange={(event) => setSuspentionEnd(event.target.value)}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            loading={isSubmittingSuspention}
            onClick={handleRegisterSuspention}
          >
            Registrar suspensión
          </Button>
        </div>

        <div className="mt-6">
          <Table
            columns={suspentionColumns}
            data={suspentions}
            isLoading={isLoadingRecords}
            emptyMessage="No hay suspensiones registradas"
          />
        </div>
      </div>

      <SuspentionEditorModal
        isOpen={suspentionModalOpen}
        suspention={editingSuspention}
        onClose={() => {
          setSuspentionModalOpen(false);
          setEditingSuspention(null);
        }}
        onSubmit={handleSubmitEditSuspention}
      />
    </div>
  );
}
