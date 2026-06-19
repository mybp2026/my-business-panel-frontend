import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { conceptApi } from "@/api/concept.api";
import { payrollApi } from "@/api/payroll.api";
import { paysheetApi } from "@/api/paysheet.api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import {
  IconCalendar,
  IconCreditCard,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  CreateHrConceptPayload,
  HrPayrollConcept,
  HrPaysheet,
  UpdateHrConceptPayload,
} from "@/interfaces/entities/Hr.interface";
import type { HrPayrollPageLoaderData } from "@/router/loaders/hr.loaders";

import { ConceptUpsertModal } from "./ConceptUpsertModal";
import { PayrollConfirmModal } from "./PayrollConfirmModal";
import { PaysheetDetailModal } from "./PaysheetDetailModal";
import { employeeApi } from "@/api/employee.api";

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

export function HRPayrollPage() {
  const {
    currentUser,
    branches,
    concepts: initialConcepts,
    paysheets: initialPaysheets,
  } = useLoaderData() as HrPayrollPageLoaderData;

  const [concepts, setConcepts] = useState(initialConcepts);
  const [paysheets, setPaysheets] = useState(initialPaysheets);
  const [selectedConcept, setSelectedConcept] =
    useState<HrPayrollConcept | null>(null);
  const [selectedPaysheet, setSelectedPaysheet] = useState<HrPaysheet | null>(
    null,
  );
  const [createPaysheetBranchId, setCreatePaysheetBranchId] = useState(
    branches[0]?.branch_id ?? "",
  );
  const [historyBranchId, setHistoryBranchId] = useState("");
  const [periodStart, setPeriodStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
  );
  const [periodEnd, setPeriodEnd] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
  );
  const [isCreatingPaysheet, setIsCreatingPaysheet] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmPaysheet, setConfirmPaysheet] = useState<HrPaysheet | null>(
    null,
  );
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);
  const [employees, setEmployees] = useState<Awaited<
    ReturnType<typeof employeeApi.listByTenant>
  >>([]);

  const branchMap = useMemo(
    () =>
      new Map(
        branches.map((branch) => [branch.branch_id, branch.branch_name]),
      ),
    [branches],
  );

  const refreshConcepts = async () => {
    const tenantId = currentUser.tenant.tenant_id;
    const nextConcepts = await conceptApi.listByTenant(tenantId);
    setConcepts(nextConcepts);
  };

  useEffect(() => {
    if (initialConcepts.length === 0) {
      conceptApi
        .provisionDefaults()
        .then((result) => {
          if (result.created > 0) {
            refreshConcepts();
            setToast({ mode: "success", message: result.message });
          }
        })
        .catch(() => {
          // Si falla el aprovisionamiento, el usuario puede crear conceptos manualmente
        });
    }
    // Solo en mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPaysheets = (branchId: string) => {
    const tenantId = currentUser.tenant.tenant_id;
    return branchId
      ? paysheetApi.listByBranch(branchId)
      : paysheetApi.listByTenant(tenantId);
  };

  const refreshPaysheets = async () => {
    setPaysheets(await loadPaysheets(historyBranchId));
  };

  const handleHistoryBranchChange = async (branchId: string) => {
    setHistoryBranchId(branchId);
    setPaysheets(await loadPaysheets(branchId));
  };

  const refreshEmployees = async () => {
    if (employees.length) return;
    const tenantId = currentUser.tenant.tenant_id;
    const nextEmployees = await employeeApi.listByTenant(tenantId);
    setEmployees(nextEmployees);
  };

  const handleCreateConcept = async (payload: CreateHrConceptPayload) => {
    try {
      await conceptApi.create(payload);
      await refreshConcepts();
      setToast({
        mode: "success",
        message: "Concepto creado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "No se pudo crear el concepto",
      });
      throw error;
    }
  };

  const handleUpdateConcept = async (
    conceptId: number,
    payload: UpdateHrConceptPayload,
  ) => {
    try {
      await conceptApi.update(conceptId, payload);
      await refreshConcepts();
      setToast({
        mode: "success",
        message: "Concepto actualizado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el concepto",
      });
      throw error;
    }
  };

  const handleReactivateConcept = async (concept: HrPayrollConcept) => {
    try {
      await conceptApi.reactivate(concept.concept_id);
      await refreshConcepts();
      setToast({ mode: "success", message: "Concepto reactivado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo reactivar el concepto",
      });
    }
  };

  const handleSoftDeleteConcept = async (concept: HrPayrollConcept) => {
    if (!confirm(`¿Desactivar el concepto ${concept.name}?`)) return;

    try {
      await conceptApi.softDelete(concept.concept_id);
      await refreshConcepts();
      setToast({
        mode: "success",
        message: "Concepto desactivado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo desactivar el concepto",
      });
    }
  };

  const handleDeleteConcept = async (concept: HrPayrollConcept) => {
    if (!confirm(`¿Eliminar el concepto ${concept.name}?`)) return;

    try {
      await conceptApi.delete(concept.concept_id);
      await refreshConcepts();
      setToast({
        mode: "success",
        message: "Concepto eliminado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el concepto",
      });
    }
  };

  const handleCreatePaysheet = async () => {
    if (!createPaysheetBranchId || !periodStart || !periodEnd) {
      setToast({
        mode: "error",
        message: "Complete sucursal y fechas para crear la nómina",
      });
      return;
    }

    setIsCreatingPaysheet(true);

    try {
      await payrollApi.createPaysheet({
        tenantId: currentUser.tenant.tenant_id,
        branchId: createPaysheetBranchId,
        periodStart,
        periodEnd,
      });
      await refreshPaysheets();
      setToast({
        mode: "success",
        message: "Nómina creada correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "No se pudo crear la nómina",
      });
    } finally {
      setIsCreatingPaysheet(false);
    }
  };

  const handleOpenConfirmPaysheet = async (paysheet: HrPaysheet) => {
    await refreshEmployees();
    setConfirmPaysheet(paysheet);
  };

  const handleConfirmProcessPaysheet = async () => {
    if (!confirmPaysheet) return;

    setProcessingId(confirmPaysheet.paysheet_id);

    try {
      await payrollApi.processPaysheet(confirmPaysheet.paysheet_id, {
        branch_id: confirmPaysheet.branch_id,
        tenant_id: confirmPaysheet.tenant_id,
        period_start: confirmPaysheet.period_start,
        period_end: confirmPaysheet.period_end,
      });
      setConfirmPaysheet(null);
      await refreshPaysheets();
      setToast({ mode: "success", message: "Nómina procesada correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la nómina",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const conceptColumns: Column[] = [
    { key: "name", label: "Concepto", width: "22%" },
    {
      key: "type",
      label: "Tipo",
      width: "12%",
      render: (value: string) => (
        <Badge variant={value === "earning" ? "green" : "secondary"}>
          {value === "earning" ? "Ingreso" : "Deducción"}
        </Badge>
      ),
    },
    { key: "calculation_method", label: "Cálculo", width: "14%" },
    {
      key: "is_taxable",
      label: "Impuesto",
      width: "12%",
      render: (value: boolean) => (value ? "Sí" : "No"),
    },
    {
      key: "base_value",
      label: "Valor base",
      width: "14%",
      render: (value: number | string, row: HrPayrollConcept) => {
        const num = Number(value);
        if (row.calculation_method === "percentage")
          return `${(num * 100).toFixed(2)}%`;
        if (row.calculation_method === "fixed") return formatCurrency(num);
        if (row.calculation_method === "manual") return "—";
        return String(value);
      },
    },
    { key: "code", label: "Código", width: "10%" },
    {
      key: "is_active",
      label: "Estado",
      width: "10%",
      render: (value: boolean | undefined) =>
        value === false ? (
          <Badge variant="secondary">Inactivo</Badge>
        ) : (
          <Badge variant="green">Activo</Badge>
        ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "14%",
      render: (_value: unknown, row: HrPayrollConcept) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedConcept(row)}
          >
            <IconEdit />
          </Button>
          {row.is_active === false ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleReactivateConcept(row)}
            >
              <IconPlus />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleSoftDeleteConcept(row)}
            >
              <IconCreditCard />
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            onClick={() => handleDeleteConcept(row)}
          >
            <IconTrash />
          </Button>
        </div>
      ),
    },
  ];

  const paysheetColumns: Column[] = [
    {
      key: "branch_id",
      label: "Sucursal",
      width: "18%",
      render: (value: string) => branchMap.get(value) ?? value,
    },
    {
      key: "period_start",
      label: "Periodo",
      width: "22%",
      render: (_value: unknown, row: HrPaysheet) =>
        `${formatDate(row.period_start)} → ${formatDate(row.period_end)}`,
    },
    {
      key: "total_earnings",
      label: "Ingresos",
      width: "14%",
      render: (value: number) => formatCurrency(value),
    },
    {
      key: "total_deductions",
      label: "Deducciones",
      width: "14%",
      render: (value: number) => formatCurrency(value),
    },
    {
      key: "net_total",
      label: "Neto",
      width: "14%",
      render: (value: number) => formatCurrency(value),
    },
    {
      key: "status_id",
      label: "Estado",
      width: "8%",
      render: (value: number) => (
        <Badge variant={value === 2 ? "green" : "secondary"}>
          {value === 2 ? "Procesada" : "Pendiente"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "10%",
      render: (_value: unknown, row: HrPaysheet) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await refreshEmployees();
              setSelectedPaysheet(row);
            }}
          >
            <IconEdit />
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={row.status_id === 2}
            loading={processingId === row.paysheet_id}
            onClick={() => handleOpenConfirmPaysheet(row)}
          >
            Procesar
          </Button>
        </div>
      ),
    },
  ];

  const activeConcepts = concepts.filter((concept) => concept.is_active !== false);
  const processedPaysheets = paysheets.filter((paysheet) => paysheet.status_id === 2);

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Nómina</h1>
        <p className="text-gray-600">
          Gestione conceptos, periodos de pago, descuentos y procesamiento de
          planillas.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard
          label="Conceptos activos"
          value={activeConcepts.length}
          sublabel={`${concepts.length} conceptos totales`}
          icon={<IconCreditCard />}
          accent
        />
        <StatCard
          label="Nóminas procesadas"
          value={processedPaysheets.length}
          sublabel={`${paysheets.length} periodos creados`}
          icon={<IconCalendar />}
        />
        <StatCard
          label="Total neto histórico"
          value={formatCurrency(
            processedPaysheets.reduce(
              (total, paysheet) => total + Number(paysheet.net_total),
              0,
            ),
          )}
          sublabel="Suma de nóminas cerradas"
          icon={<IconCreditCard />}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-300 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Conceptos de nómina
              </h2>
              <p className="text-sm text-gray-500">
                Ingresos y deducciones usados por el motor de cálculo.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setSelectedConcept({} as HrPayrollConcept)}>
                <IconPlus />
                Nuevo concepto
              </Button>
            </div>
          </div>

          <Table
            columns={conceptColumns}
            data={concepts}
            emptyMessage="No hay conceptos registrados. Espere la carga automática o cree uno manualmente."
          />
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Crear periodo de nómina
            </h2>
            <p className="text-sm text-gray-500">
              Abra un paysheet para luego procesarlo con horas, fouls,
              tardiness e incapacidades.
            </p>
          </div>

          <div className="space-y-4">
            <Select
              label="Sucursal"
              value={createPaysheetBranchId}
              onChange={(event) => setCreatePaysheetBranchId(event.target.value)}
              options={branches.map((branch) => ({
                value: branch.branch_id,
                label: branch.branch_name,
              }))}
            />
            <Input
              label="Inicio del periodo"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
            <Input
              label="Fin del periodo"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
            <Button
              type="button"
              fullWidth
              onClick={handleCreatePaysheet}
              loading={isCreatingPaysheet}
            >
              Crear nómina
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Historial de nóminas
            </h2>
            <p className="text-sm text-gray-500">
              Procese el periodo y consulte sus detalles por empleado.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              label="Filtrar por sucursal"
              value={historyBranchId}
              onChange={(event) => handleHistoryBranchChange(event.target.value)}
              options={[
                { value: "", label: "Todas las sucursales" },
                ...branches.map((branch) => ({
                  value: branch.branch_id,
                  label: branch.branch_name,
                })),
              ]}
            />
          </div>
        </div>

        <Table
          columns={paysheetColumns}
          data={paysheets}
          emptyMessage="No hay nóminas registradas"
        />
      </div>

      <ConceptUpsertModal
        isOpen={selectedConcept !== null}
        tenantId={currentUser.tenant.tenant_id}
        concept={selectedConcept && selectedConcept.concept_id ? selectedConcept : null}
        onClose={() => setSelectedConcept(null)}
        onCreate={handleCreateConcept}
        onUpdate={handleUpdateConcept}
      />

      <PayrollConfirmModal
        isOpen={confirmPaysheet !== null}
        paysheet={confirmPaysheet}
        employees={employees}
        concepts={concepts}
        isProcessing={processingId !== null}
        onConfirm={handleConfirmProcessPaysheet}
        onClose={() => setConfirmPaysheet(null)}
      />

      <PaysheetDetailModal
        isOpen={selectedPaysheet !== null}
        paysheet={selectedPaysheet}
        employees={employees}
        onClose={() => setSelectedPaysheet(null)}
      />
    </div>
  );
}
