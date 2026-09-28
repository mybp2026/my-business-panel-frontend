import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { contractApi } from "@/api/contract.api";
import { dutiesTypeApi } from "@/api/dutiesType.api";
import { employeeApi } from "@/api/employee.api";
import type { CreateEmployeeWithContractPayload } from "@/api/employee.api";
import { userApi } from "@/api/user.api";

import { useDebounce } from "@/hooks/useDebounce";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";

import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { useDisplayCurrency } from "@/context/CurrencyContext";
import { bsToUsd, formatBs, formatUsd } from "@/utils/dualCurrency";

import { IconEdit, IconPlus, IconTrash, IconUsers } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { CreateUserRequest } from "@/interfaces/api/requests/CreateUserRequest.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrDutiesType,
  HrEmployeeRecord,
} from "@/interfaces/entities/Hr.interface";
import type {
  UpdateContractPayload,
  UpdateEmployeePayload,
} from "@/interfaces/entities/Employee.interface";
import type { HrEmployeesPageLoaderData } from "@/router/loaders/hr.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { EmployeeUpsertModal } from "./EmployeeUpsertModal";
import { DutyTypeModal } from "./DutyTypeModal";

type StatusFilter = "all" | "active" | "inactive";

export function HREmployeesPage() {
  const { data } = useLoaderData() as {
    data: Promise<HrEmployeesPageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {(resolved) => <HREmployeesPageContent {...resolved} />}
    </DeferredPage>
  );
}

function HREmployeesPageContent({
  currentUser,
  branches,
  employees: initialEmployees,
  paymentSchedules,
  turns,
  roles,
  dutiesTypes: initialDutiesTypes,
}: HrEmployeesPageLoaderData) {
  const rate = useCurrentExchangeRate();
  const { displayCurrency } = useDisplayCurrency();
  const [employees, setEmployees] = useState(initialEmployees);
  const [dutiesTypes, setDutiesTypes] =
    useState<HrDutiesType[]>(initialDutiesTypes);
  const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedEmployee, setSelectedEmployee] =
    useState<HrEmployeeRecord | null>(null);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const paymentScheduleMap = useMemo(
    () =>
      new Map(
        paymentSchedules.map((schedule) => [
          schedule.payment_schedule_id,
          schedule.description,
        ]),
      ),
    [paymentSchedules],
  );

  const turnMap = useMemo(
    () =>
      new Map(
        turns.map((turn) => [
          turn.turn_id,
          `${turn.entry.slice(0, 5)} - ${turn.out.slice(0, 5)}`,
        ]),
      ),
    [turns],
  );

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const tenantId = currentUser.tenant.tenant_id;
        const allEmployees = await employeeApi.listByTenant(tenantId);

        // Aplicar filtros localmente
        const filtered = allEmployees.filter((employee) => {
          const matchesBranch =
            !branchFilter || employee.branch_id === branchFilter;
          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && employee.is_active) ||
            (statusFilter === "inactive" && !employee.is_active);
          const matchesSearch =
            !debouncedSearch.trim() ||
            `${employee.first_name || ""} ${employee.last_name || ""}`
              .toLowerCase()
              .includes(debouncedSearch.trim().toLowerCase()) ||
            (employee.doc_number
              ?.toLowerCase()
              .includes(debouncedSearch.trim().toLowerCase()) ??
              false) ||
            (employee.email
              ?.toLowerCase()
              .includes(debouncedSearch.trim().toLowerCase()) ??
              false);

          return matchesBranch && matchesStatus && matchesSearch;
        });

        setEmployees(filtered);
      } catch (error) {
        setToast({
          mode: "error",
          message:
            error instanceof Error
              ? error.message
              : "Error al cargar empleados",
        });
      }
    };

    fetchEmployees();
  }, [
    debouncedSearch,
    branchFilter,
    statusFilter,
    currentUser.tenant.tenant_id,
  ]);

  const filteredEmployees = useMemo(() => employees, [employees]);

  const refreshEmployees = async () => {
    const tenantId = currentUser.tenant.tenant_id;
    const updatedEmployees = await employeeApi.listByTenant(tenantId);
    setEmployees(updatedEmployees);
  };

  const handleCreate = async (payload: CreateUserRequest) => {
    try {
      await userApi.create(payload);
      await refreshEmployees();
      setToast({
        mode: "success",
        message: "Empleado creado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear el empleado",
      });
      throw error;
    }
  };

  const handleCreateNoUser = async (
    payload: CreateEmployeeWithContractPayload,
  ) => {
    try {
      await employeeApi.createWithContract(payload);
      await refreshEmployees();
      setToast({ mode: "success", message: "Empleado creado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear el empleado",
      });
      throw error;
    }
  };

  const handleCreateDuty = async (name: string, description: string) => {
    try {
      const created = await dutiesTypeApi.create({
        tenant_id: currentUser.tenant.tenant_id,
        name,
        description: description || undefined,
      });
      setDutiesTypes((prev) => [...prev, created]);
      setToast({ mode: "success", message: "Tipo de cargo creado" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al crear tipo de cargo",
      });
      throw error;
    }
  };

  const handleDeleteDuty = async (id: number) => {
    if (!confirm("¿Eliminar este tipo de cargo?")) return;
    try {
      await dutiesTypeApi.remove(id);
      setDutiesTypes((prev) => prev.filter((dt) => dt.duties_type_id !== id));
      setToast({ mode: "success", message: "Tipo de cargo eliminado" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al eliminar tipo de cargo",
      });
    }
  };

  const handleUpdate = async (
    employeeId: string,
    contractId: string,
    payload: {
      employee: UpdateEmployeePayload;
      contract: UpdateContractPayload;
    },
  ) => {
    try {
      await Promise.all([
        employeeApi.update(employeeId, payload.employee),
        contractApi.update(contractId, payload.contract),
      ]);
      await refreshEmployees();
      setToast({
        mode: "success",
        message: "Empleado actualizado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el empleado",
      });
      throw error;
    }
  };

  const handleDeactivate = async (employee: HrEmployeeRecord) => {
    if (
      !confirm(
        `¿Desea desactivar a ${employee.first_name} ${employee.last_name}?`,
      )
    ) {
      return;
    }

    try {
      await employeeApi.deactivate(employee.employee_id);
      setEmployees((prev) =>
        prev.map((item) =>
          item.employee_id === employee.employee_id
            ? { ...item, is_active: false }
            : item,
        ),
      );
      setToast({
        mode: "success",
        message: "Empleado desactivado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo desactivar el empleado",
      });
    }
  };

  const handleDelete = async (employee: HrEmployeeRecord) => {
    if (
      !confirm(
        `¿Eliminar al empleado ${employee.first_name} ${employee.last_name}? Esta acción también eliminará su usuario.`,
      )
    ) {
      return;
    }

    const previous = employees;
    setEmployees((prev) =>
      prev.filter((item) => item.employee_id !== employee.employee_id),
    );

    try {
      if (employee.user_id) {
        await userApi.delete(employee.user_id);
      } else {
        await employeeApi.deactivate(employee.employee_id);
      }
      setToast({
        mode: "success",
        message: "Empleado eliminado correctamente",
      });
    } catch (error) {
      setEmployees(previous);
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el empleado",
      });
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const openEdit = (employee: HrEmployeeRecord) => {
    setModalMode("edit");
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const columns: Column[] = [
    {
      key: "first_name",
      label: "Empleado",
      width: "22%",
      render: (_value: unknown, row: HrEmployeeRecord) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    { key: "doc_number", label: "Documento", width: "12%" },
    { key: "branch_name", label: "Sucursal", width: "14%" },
    {
      key: "payment_schedule_id",
      label: "Pago",
      width: "12%",
      render: (value: number) => paymentScheduleMap.get(value) ?? `#${value}`,
    },
    {
      key: "base_salary",
      label: "Salario",
      width: "12%",
      render: (value: number) => (
        <DualCurrencyAmount
          amountBs={Number(value)}
          rate={rate}
          hideSecondary
        />
      ),
    },
    {
      key: "turn_id",
      label: "Turno",
      width: "12%",
      render: (value: number, row: HrEmployeeRecord) => (
        <div>
          <p className="text-gray-900">
            {turnMap.get(value) ?? `Turno ${value}`}
          </p>
          <p className="text-xs text-gray-500">{row.turn_type} h por turno</p>
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Estado",
      width: "8%",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "gray"}>
          {value ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "8%",
      render: (_value: unknown, row: HrEmployeeRecord) => (
        <div
          className="flex gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            title="Editar empleado"
            onClick={() => openEdit(row)}
          >
            <IconEdit />
          </Button>
          {row.is_active && (
            <Button
              type="button"
              variant="ghost"
              title="Desactivar empleado"
              onClick={() => handleDeactivate(row)}
            >
              <IconUsers />
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            title="Eliminar empleado"
            onClick={() => handleDelete(row)}
          >
            <IconTrash />
          </Button>
        </div>
      ),
    },
  ];

  const branchOptions = [
    { value: "", label: "Todas las sucursales" },
    ...branches.map((branch) => ({
      value: branch.branch_id,
      label: branch.branch_name,
    })),
  ];

  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  const activeCount = employees.filter((employee) => employee.is_active).length;
  const totalPayrollBase = employees.reduce(
    (total, employee) => total + Number(employee.base_salary),
    0,
  );

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
        title="Empleados"
        description={`Controle altas, cambios y estado operativo de la plantilla de ${currentUser.tenant.tenant_name}.`}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
        <StatCard
          label="Empleados registrados"
          value={employees.length}
          sublabel={`${activeCount} activos`}
          icon={<IconUsers />}
          accent
        />
        <StatCard
          label="Sucursales con personal"
          value={new Set(employees.map((employee) => employee.branch_id)).size}
          sublabel="Distribución del tenant"
          icon={<IconUsers />}
        />
        <StatCard
          label="Base salarial mensual"
          value={
            displayCurrency === "VES"
              ? formatBs(totalPayrollBase)
              : bsToUsd(totalPayrollBase, rate) !== null
                ? formatUsd(bsToUsd(totalPayrollBase, rate)!)
                : "—"
          }
          sublabel={
            displayCurrency === "VES"
              ? bsToUsd(totalPayrollBase, rate) !== null
                ? `≈ ${formatUsd(bsToUsd(totalPayrollBase, rate)!)}`
                : "Sin tasa configurada"
              : `≈ ${formatBs(totalPayrollBase)}`
          }
          icon={<IconUsers />}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Input
            label="Buscar"
            placeholder="Nombre, documento o email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label="Sucursal"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            options={branchOptions}
          />
          <Select
            label="Estado"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            options={statusOptions}
          />

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsDutyModalOpen(true)}
          >
            Tipos de cargo
          </Button>

          <Button onClick={openCreate}>
            <IconPlus />
            Nuevo empleado
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredEmployees}
        emptyMessage="No hay empleados registrados con esos filtros"
      />

      <EmployeeUpsertModal
        isOpen={isModalOpen}
        mode={modalMode}
        employee={selectedEmployee}
        tenantId={currentUser.tenant.tenant_id}
        branches={branches}
        roles={roles}
        paymentSchedules={paymentSchedules}
        turns={turns}
        dutiesTypes={dutiesTypes}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmployee(null);
          setModalMode("create");
        }}
        onCreate={handleCreate}
        onCreateNoUser={handleCreateNoUser}
        onUpdate={handleUpdate}
      />

      <DutyTypeModal
        isOpen={isDutyModalOpen}
        dutiesTypes={dutiesTypes}
        onClose={() => setIsDutyModalOpen(false)}
        onCreate={handleCreateDuty}
        onDelete={handleDeleteDuty}
      />
    </div>
  );
}
