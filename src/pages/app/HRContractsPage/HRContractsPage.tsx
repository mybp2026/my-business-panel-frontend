import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { contractApi } from "@/api/contract.api";
import { employeeApi } from "@/api/employee.api";
import type { CreateEmployeeWithContractPayload } from "@/api/employee.api";
import { userApi } from "@/api/user.api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import {
  IconBriefcase,
  IconEdit,
  IconEye,
  IconPlus,
  IconTrash,
} from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { CreateUserRequest } from "@/interfaces/api/requests/CreateUserRequest.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { UpdateContractPayload } from "@/interfaces/entities/Employee.interface";
import type { HrContractsPageLoaderData } from "@/router/loaders/hr.loaders";
import type { HrEmployeeRecord } from "@/interfaces/entities/Hr.interface";

import { EmployeeUpsertModal } from "@/pages/app/HREmployeesPage/EmployeeUpsertModal";
import { ContractEditorModal } from "./ContractEditorModal";
import { ContractDetailModal } from "./ContractDetailModal";

const formatCurrency = (value: number) =>
  `Bs. ${Number(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

export function HRContractsPage() {
  const {
    currentUser,
    branches,
    employees: initialEmployees,
    paymentSchedules,
    turns,
    roles,
    dutiesTypes,
  } = useLoaderData() as HrContractsPageLoaderData;

  const [employees, setEmployees] = useState(initialEmployees);
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [detailContract, setDetailContract] = useState<HrEmployeeRecord | null>(
    null,
  );
  const [editingContract, setEditingContract] = useState<HrEmployeeRecord | null>(
    null,
  );
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const filteredContracts = useMemo(() => {
    return employees.filter((employee) => {
      const matchesBranch =
        !branchFilter || employee.branch_id === branchFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active);

      return matchesBranch && matchesStatus;
    });
  }, [branchFilter, employees, statusFilter]);

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
        message: "Contrato creado junto con el empleado",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "No se pudo crear el contrato",
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
          error instanceof Error ? error.message : "No se pudo crear el empleado",
      });
      throw error;
    }
  };

  const handleUpdateContract = async (
    contractId: string,
    payload: UpdateContractPayload,
  ) => {
    try {
      await contractApi.update(contractId, payload);
      await refreshEmployees();
      setToast({
        mode: "success",
        message: "Contrato actualizado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el contrato",
      });
      throw error;
    }
  };

  const handleDelete = async (employee: HrEmployeeRecord) => {
    if (
      !confirm(
        `¿Eliminar el contrato de ${employee.first_name} ${employee.last_name}? Esto también eliminará el usuario asociado.`,
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
        message: "Contrato eliminado correctamente",
      });
    } catch (error) {
      setEmployees(previous);
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "No se pudo eliminar el contrato",
      });
    }
  };

  const columns: Column[] = [
    {
      key: "first_name",
      label: "Empleado",
      width: "18%",
      render: (_value: unknown, row: HrEmployeeRecord) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-xs text-gray-500">{row.branch_name}</p>
        </div>
      ),
    },
    {
      key: "start_date",
      label: "Vigencia",
      width: "18%",
      render: (_value: unknown, row: HrEmployeeRecord) => (
        <div>
          <p>{formatDate(row.start_date)}</p>
          <p className="text-xs text-gray-500">hasta {formatDate(row.end_date)}</p>
        </div>
      ),
    },
    {
      key: "base_salary",
      label: "Salario",
      width: "12%",
      render: (value: number) => formatCurrency(value),
    },
    { key: "hours", label: "Horas/semana", width: "10%" },
    {
      key: "duties_type_name",
      label: "Cargo",
      width: "20%",
      render: (value: string | null, row: HrEmployeeRecord) =>
        value ?? row.duties ?? "-",
    },
    {
      key: "turn_id",
      label: "Turno",
      width: "12%",
      render: (value: number, row: HrEmployeeRecord) => {
        const turn = turns.find((item) => item.turn_id === value);
        const label = turn
          ? `${turn.entry.slice(0, 5)} - ${turn.out.slice(0, 5)}`
          : `Turno ${value}`;
        return (
          <div>
            <p>{label}</p>
            <p className="text-xs text-gray-500">{row.turn_type} h por turno</p>
          </div>
        );
      },
    },
    {
      key: "is_active",
      label: "Estado",
      width: "10%",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "gray"}>
          {value ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "10%",
      render: (_value: unknown, row: HrEmployeeRecord) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            title="Ver detalle"
            onClick={() => setDetailContract(row)}
          >
            <IconEye />
          </Button>
          <Button
            type="button"
            variant="ghost"
            title="Editar contrato"
            onClick={() => setEditingContract(row)}
          >
            <IconEdit />
          </Button>
          <Button
            type="button"
            variant="danger"
            title="Eliminar contrato"
            onClick={() => handleDelete(row)}
          >
            <IconTrash />
          </Button>
        </div>
      ),
    },
  ];

  const expiringSoon = employees.filter((employee) => {
    const endDate = new Date(employee.end_date);
    const diff = endDate.getTime() - Date.now();
    return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Contratos laborales
          </h1>
          <p className="text-gray-600">
            Vista contractual del personal activo e histórico del tenant.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus />
          Nuevo contrato
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard
          label="Contratos registrados"
          value={employees.length}
          sublabel="Uno por empleado"
          icon={<IconBriefcase />}
          accent
        />
        <StatCard
          label="Contratos por vencer"
          value={expiringSoon}
          sublabel="Próximos 30 días"
          icon={<IconBriefcase />}
        />
        <StatCard
          label="Masa salarial"
          value={formatCurrency(
            employees.reduce(
              (total, employee) => total + Number(employee.base_salary),
              0,
            ),
          )}
          sublabel="Base contractual"
          icon={<IconBriefcase />}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Select
            label="Sucursal"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            options={[
              { value: "", label: "Todas las sucursales" },
              ...branches.map((branch) => ({
                value: branch.branch_id,
                label: branch.branch_name,
              })),
            ]}
          />
          <Select
            label="Estado"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "active" | "inactive",
              )
            }
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ]}
          />
          <div className="flex items-end justify-end text-sm text-gray-500">
            {filteredContracts.length} contrato
            {filteredContracts.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <Table
          columns={columns}
          data={filteredContracts}
          emptyMessage="No hay contratos para mostrar con esos filtros"
        />
      </div>

      <EmployeeUpsertModal
        isOpen={createOpen}
        mode="create"
        employee={null}
        tenantId={currentUser.tenant.tenant_id}
        branches={branches}
        roles={roles}
        paymentSchedules={paymentSchedules}
        turns={turns}
        dutiesTypes={dutiesTypes}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        onCreateNoUser={handleCreateNoUser}
        onUpdate={async () => undefined}
      />

      <ContractEditorModal
        isOpen={editingContract !== null}
        employee={editingContract}
        turns={turns}
        dutiesTypes={dutiesTypes}
        onClose={() => setEditingContract(null)}
        onSubmit={handleUpdateContract}
      />

      {detailContract && (
        <ContractDetailModal
          contract={detailContract}
          turns={turns}
          onClose={() => setDetailContract(null)}
        />
      )}
    </div>
  );
}
