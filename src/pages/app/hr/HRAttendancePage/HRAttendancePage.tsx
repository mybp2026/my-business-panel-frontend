import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { clockingApi } from "@/api/clocking.api";
import { incapacityApi } from "@/api/incapacity.api";
import { turnsApi } from "@/api/turns.api";

import { Modal } from "@/components/ui/Modal";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import {
  IconCalendar,
  IconEdit,
  IconPlus,
  IconTrash,
  IconUsers,
} from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrClockingRecord,
  HrIncapacity,
  HrTurn,
} from "@/interfaces/entities/Hr.interface";
import type { HrAttendancePageLoaderData } from "@/router/loaders/hr.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { TurnEditorModal } from "./TurnEditorModal";
import { ManualClockingModal } from "./ManualClockingModal";

export function HRAttendancePage() {
  const { data } = useLoaderData() as {
    data: Promise<HrAttendancePageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {(resolved) => <HRAttendancePageContent {...resolved} />}
    </DeferredPage>
  );
}

function HRAttendancePageContent({
  currentEmployee,
  branches,
  employees,
  turns: initialTurns,
}: HrAttendancePageLoaderData) {
  const [selectedBranchId, setSelectedBranchId] = useState(
    currentEmployee?.branch_id ?? branches[0]?.branch_id ?? "",
  );
  const [turns, setTurns] = useState(initialTurns);
  const [clockings, setClockings] = useState<HrClockingRecord[]>([]);
  const [incapacities, setIncapacities] = useState<HrIncapacity[]>([]);
  const [selectedTurn, setSelectedTurn] = useState<HrTurn | null>(null);
  const [turnModalOpen, setTurnModalOpen] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const [incapacityEmployeeId, setIncapacityEmployeeId] = useState("");
  const [incapacityType, setIncapacityType] = useState("general");
  const [incapacityStart, setIncapacityStart] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [incapacityEnd, setIncapacityEnd] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [incapacityDays, setIncapacityDays] = useState("3");
  const [incapacityPercent, setIncapacityPercent] = useState("60");
  const [isSubmittingIncapacity, setIsSubmittingIncapacity] = useState(false);

  const [manualClockOutModalOpen, setManualClockOutModalOpen] = useState(false);
  const [manualClockOutId, setManualClockOutId] = useState<number | null>(null);
  const [manualClockOutDatetime, setManualClockOutDatetime] = useState("");
  const [isSubmittingManualOut, setIsSubmittingManualOut] = useState(false);

  const [manualClockingModalOpen, setManualClockingModalOpen] = useState(false);

  const branchName = branches.find(
    (branch) => branch.branch_id === selectedBranchId,
  )?.branch_name;

  const branchEmployees = useMemo(
    () =>
      employees.filter((employee) => employee.branch_id === selectedBranchId),
    [employees, selectedBranchId],
  );

  const branchTurns = useMemo(
    () => turns.filter((turn) => turn.branch_id === selectedBranchId),
    [selectedBranchId, turns],
  );

  const employeeOptions = branchEmployees.map((employee) => ({
    value: employee.employee_id,
    label: `${employee.first_name} ${employee.last_name}`,
  }));

  const refreshTurnsForBranch = async (branchId: string) => {
    const nextTurns = await turnsApi.listByBranch(branchId);
    setTurns((prev) => {
      const otherTurns = prev.filter((turn) => turn.branch_id !== branchId);
      return [...otherTurns, ...nextTurns];
    });
  };

  const loadBranchRecords = async (branchId: string) => {
    if (!branchId) return;

    setIsLoadingRecords(true);

    try {
      const [clockingRows, branchIncapacities] = await Promise.all([
        clockingApi.listByBranch(branchId),
        incapacityApi.getByBranch(branchId),
      ]);

      setClockings(clockingRows);
      setIncapacities(branchIncapacities);
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los registros de asistencia",
      });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (!selectedBranchId) return;

    loadBranchRecords(selectedBranchId);
    refreshTurnsForBranch(selectedBranchId).catch(() => undefined);
  }, [selectedBranchId]);

  useEffect(() => {
    if (!branchEmployees.length) {
      setIncapacityEmployeeId("");
      return;
    }

    if (
      !branchEmployees.some(
        (employee) => employee.employee_id === incapacityEmployeeId,
      )
    ) {
      setIncapacityEmployeeId(branchEmployees[0].employee_id);
    }
  }, [branchEmployees, incapacityEmployeeId]);

  const handleOpenCreateTurn = () => {
    setSelectedTurn(null);
    setTurnModalOpen(true);
  };

  const handleTurnSubmit = async (payload: { entry: string; out: string }) => {
    if (!selectedBranchId) return;

    try {
      if (selectedTurn) {
        await turnsApi.update(selectedTurn.turn_id, payload);
        setToast({
          mode: "success",
          message: "Turno actualizado correctamente",
        });
      } else {
        await turnsApi.create({
          branchId: selectedBranchId,
          entry: payload.entry,
          out: payload.out,
        });
        setToast({
          mode: "success",
          message: "Turno creado correctamente",
        });
      }

      await refreshTurnsForBranch(selectedBranchId);
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el turno",
      });
      throw error;
    }
  };

  const handleDeleteTurn = async (turn: HrTurn) => {
    if (!confirm("¿Eliminar este turno?")) return;

    try {
      await turnsApi.delete(turn.turn_id);
      await refreshTurnsForBranch(selectedBranchId);
      setToast({
        mode: "success",
        message: "Turno eliminado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el turno",
      });
    }
  };

  const handleRegisterIncapacity = async () => {
    if (
      !selectedBranchId ||
      !incapacityEmployeeId ||
      !incapacityType.trim() ||
      !incapacityStart ||
      !incapacityEnd
    ) {
      setToast({
        mode: "error",
        message: "Complete los datos de incapacidad",
      });
      return;
    }

    setIsSubmittingIncapacity(true);

    try {
      await incapacityApi.create({
        employee_id: incapacityEmployeeId,
        branch_id: selectedBranchId,
        type: incapacityType,
        period_start: incapacityStart,
        period_end: incapacityEnd,
        days_paying: Number(incapacityDays),
        percentage_to_pay: Number(incapacityPercent),
      });
      await loadBranchRecords(selectedBranchId);
      setToast({
        mode: "success",
        message: "Incapacidad registrada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la incapacidad",
      });
    } finally {
      setIsSubmittingIncapacity(false);
    }
  };

  const openManualClockOut = (clockingId: number) => {
    setManualClockOutId(clockingId);
    setManualClockOutDatetime(new Date().toISOString().slice(0, 16));
    setManualClockOutModalOpen(true);
  };

  const handleManualClockOut = async () => {
    if (!manualClockOutId || !manualClockOutDatetime) return;

    setIsSubmittingManualOut(true);
    try {
      await clockingApi.manualClockOut({
        clockingId: manualClockOutId,
        clockOut: manualClockOutDatetime,
      });
      await loadBranchRecords(selectedBranchId);
      setManualClockOutModalOpen(false);
      setManualClockOutId(null);
      setToast({
        mode: "success",
        message: "Clock-out manual registrado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el clock-out",
      });
    } finally {
      setIsSubmittingManualOut(false);
    }
  };

  const handleManualClockingSubmit = async (data: {
    employeeId: string;
    clockIn: string;
    clockOut?: string;
  }) => {
    if (!selectedBranchId) return;

    try {
      const result = await clockingApi.manualClockIn({
        employeeId: data.employeeId,
        branchId: selectedBranchId,
        clockIn: data.clockIn,
      });

      if (data.clockOut) {
        await clockingApi.manualClockOut({
          clockingId: result.clockingId,
          clockOut: data.clockOut,
        });
      }

      await loadBranchRecords(selectedBranchId);
      setToast({
        mode: "success",
        message: "Asistencia manual registrada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la asistencia manual",
      });
      throw error;
    }
  };

  const handleCloseIncapacity = async (incapacityId: number) => {
    try {
      await incapacityApi.close(incapacityId);
      await loadBranchRecords(selectedBranchId);
      setToast({
        mode: "success",
        message: "Incapacidad cerrada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cerrar la incapacidad",
      });
    }
  };

  const turnColumns: Column[] = [
    { key: "turn_id", label: "ID", width: "12%" },
    {
      key: "entry",
      label: "Entrada",
      width: "22%",
      render: (value: string) => value.slice(0, 5),
    },
    {
      key: "out",
      label: "Salida",
      width: "22%",
      render: (value: string) => value.slice(0, 5),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "24%",
      render: (_value: unknown, row: HrTurn) => (
        <div
          className="flex gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelectedTurn(row);
              setTurnModalOpen(true);
            }}
          >
            <IconEdit />
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => handleDeleteTurn(row)}
          >
            <IconTrash />
          </Button>
        </div>
      ),
    },
  ];

  const clockingColumns: Column[] = [
    {
      key: "employee_id",
      label: "Empleado",
      width: "22%",
      render: (_value: unknown, row: HrClockingRecord) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-xs text-gray-500">{row.branch_name}</p>
        </div>
      ),
    },
    { key: "clock_in", label: "Entrada", width: "22%" },
    {
      key: "clock_out",
      label: "Salida",
      width: "22%",
      render: (value: string | null) => value ?? "—",
    },
    {
      key: "turn_hours",
      label: "Horas",
      width: "12%",
      render: (value: number) => Number(value).toFixed(2),
    },
    {
      key: "clock_out_status",
      label: "Estado",
      width: "12%",
      render: (_value: unknown, row: HrClockingRecord) => (
        <Badge variant={row.clock_out ? "secondary" : "green"}>
          {row.clock_out ? "Cerrado" : "Abierto"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "10%",
      render: (_value: unknown, row: HrClockingRecord) =>
        !row.clock_out ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openManualClockOut(row.clocking_id);
            }}
          >
            Cerrar
          </Button>
        ) : null,
    },
  ];

  const incapacityColumns: Column[] = [
    { key: "type", label: "Tipo", width: "16%" },
    { key: "period_start", label: "Inicio", width: "16%" },
    { key: "period_end", label: "Fin", width: "16%" },
    { key: "percentage_to_pay", label: "% pago", width: "14%" },
    { key: "days_paying", label: "Días", width: "10%" },
    {
      key: "actions",
      label: "Acciones",
      width: "16%",
      render: (_value: unknown, row: HrIncapacity) => (
        <Button
          type="button"
          variant="warning"
          onClick={() => handleCloseIncapacity(row.incapacity_id)}
        >
          Cerrar
        </Button>
      ),
    },
  ];

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
        title="Horarios"
        description="Clocking automático, turnos e incapacidades que afectan la nómina."
      />

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Select
            label="Sucursal"
            value={selectedBranchId}
            onChange={(event) => setSelectedBranchId(event.target.value)}
            options={branches.map((branch) => ({
              value: branch.branch_id,
              label: branch.branch_name,
            }))}
          />
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">Clocking automático</p>
            <p>
              El sistema registra `clock in` al iniciar sesión y `clock out` al
              cerrar sesión.
            </p>
          </div>
          {currentEmployee ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">
                Mi asignación actual
              </p>
              <p>
                {branchName} · turno {currentEmployee.turn_id} ·{" "}
                {currentEmployee.turn_type} h
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">
                Usuario sin ficha HR
              </p>
              <p>
                Este usuario no tiene empleado asociado para clocking propio.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard
          label="Turnos"
          value={branchTurns.length}
          sublabel={branchName}
          icon={<IconCalendar />}
          accent
        />
        <StatCard
          label="Clockings abiertos"
          value={clockings.filter((clocking) => !clocking.clock_out).length}
          sublabel="Sesiones en curso"
          icon={<IconUsers />}
        />
        <StatCard
          label="Incapacidades activas"
          value={incapacities.filter((inc) => inc.is_active).length}
          sublabel={branchName}
          icon={<IconCalendar />}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-gray-300 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Turnos</h2>
              <p className="text-sm text-gray-500">
                Defina horarios de entrada y salida por sucursal.
              </p>
            </div>
            <Button onClick={handleOpenCreateTurn}>
              <IconPlus />
              Nuevo turno
            </Button>
          </div>

          <Table
            columns={turnColumns}
            data={branchTurns}
            emptyMessage="No hay turnos configurados para esta sucursal"
          />
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Registros de clocking
              </h2>
              <p className="text-sm text-gray-500">
                Historial de entradas y salidas generadas automáticamente.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setManualClockingModalOpen(true)}
            >
              <IconPlus />
              Registro manual
            </Button>
          </div>

          <Table
            columns={clockingColumns}
            data={clockings}
            isLoading={isLoadingRecords}
            emptyMessage="No hay marcajes registrados para esta sucursal"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Incapacidades</h2>
          <p className="text-sm text-gray-500">
            Controle incapacidades vigentes para el cálculo de nómina.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Empleado"
            value={incapacityEmployeeId}
            onChange={(event) => setIncapacityEmployeeId(event.target.value)}
            options={employeeOptions}
          />
          <Input
            label="Tipo"
            value={incapacityType}
            onChange={(event) => setIncapacityType(event.target.value)}
          />
          <Input
            label="Inicio"
            type="date"
            value={incapacityStart}
            onChange={(event) => setIncapacityStart(event.target.value)}
          />
          <Input
            label="Fin"
            type="date"
            value={incapacityEnd}
            onChange={(event) => setIncapacityEnd(event.target.value)}
          />
          <Input
            label="Días a pagar"
            type="number"
            min="0"
            value={incapacityDays}
            onChange={(event) => setIncapacityDays(event.target.value)}
          />
          <Input
            label="% a pagar"
            type="number"
            min="0"
            step="0.01"
            value={incapacityPercent}
            onChange={(event) => setIncapacityPercent(event.target.value)}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            loading={isSubmittingIncapacity}
            onClick={handleRegisterIncapacity}
          >
            Registrar incapacidad
          </Button>
        </div>

        <div className="mt-6">
          <Table
            columns={incapacityColumns}
            data={incapacities}
            isLoading={isLoadingRecords}
            emptyMessage="No hay incapacidades activas"
          />
        </div>
      </div>

      <TurnEditorModal
        isOpen={turnModalOpen}
        turn={selectedTurn}
        branchName={branchName}
        onClose={() => {
          setTurnModalOpen(false);
          setSelectedTurn(null);
        }}
        onSubmit={handleTurnSubmit}
      />

      <ManualClockingModal
        isOpen={manualClockingModalOpen}
        employees={employeeOptions}
        onClose={() => setManualClockingModalOpen(false)}
        onSubmit={handleManualClockingSubmit}
      />

      <Modal
        isOpen={manualClockOutModalOpen}
        onClose={() => {
          setManualClockOutModalOpen(false);
          setManualClockOutId(null);
        }}
        title="Registrar salida manual"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Clocking ID:{" "}
            <span className="font-mono font-semibold text-gray-900">
              {manualClockOutId}
            </span>
          </p>
          <Input
            label="Fecha y hora de salida"
            type="datetime-local"
            value={manualClockOutDatetime}
            onChange={(e) => setManualClockOutDatetime(e.target.value)}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmittingManualOut}
              onClick={() => {
                setManualClockOutModalOpen(false);
                setManualClockOutId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              loading={isSubmittingManualOut}
              onClick={handleManualClockOut}
            >
              Confirmar salida
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
