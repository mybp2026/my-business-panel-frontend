import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

import { useUniqueAvailability } from "@/hooks/useUniqueAvailability";

import { employeeApi } from "@/api/employee.api";
import type { CreateEmployeeWithContractPayload } from "@/api/employee.api";
import { userApi } from "@/api/user.api";

import { identificationTypes } from "@/constants/identification-types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Role } from "@/interfaces/entities/Role.interface";
import type { CreateUserRequest } from "@/interfaces/api/requests/CreateUserRequest.interface";
import type {
  HrDutiesType,
  HrEmployeeRecord,
  HrPaymentSchedule,
  HrTurn,
} from "@/interfaces/entities/Hr.interface";
import type {
  UpdateContractPayload,
  UpdateEmployeePayload,
} from "@/interfaces/entities/Employee.interface";

import {
  accountSchema,
  contractSchema,
  employeeSchema,
} from "@/pages/app/gen/UsersPage/newUser.schema";
import { capitalize } from "@/utils/capitalize";

type EmployeeFields = z.infer<typeof employeeSchema>;
type ContractFields = z.infer<typeof contractSchema>;
type AccountFields = z.infer<typeof accountSchema>;

type EmployeeErrors = Partial<Record<keyof EmployeeFields, string>>;
type ContractErrors = Partial<Record<keyof ContractFields, string>>;
type AccountErrors = Partial<Record<keyof AccountFields, string>>;

const EMPTY_EMPLOYEE: EmployeeFields = {
  first_name: "",
  last_name: "",
  document_number: "",
  identification_type_id: 1,
  phone: "",
  employee_email: "",
  branch_id: "",
  payment_schedule_id: "",
};

const EMPTY_CONTRACT: ContractFields = {
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  hours: "40",
  base_salary: "0",
  duties: "",
  duties_type_id: "",
  turn_type: "8",
  turn_id: "",
};

const EMPTY_ACCOUNT: AccountFields = {
  email: "",
  password: "",
  confirmPassword: "",
  role_id: 2,
};

const mapZodErrors = <T extends string>(
  issues: z.ZodIssue[],
): Partial<Record<T, string>> =>
  issues.reduce<Partial<Record<T, string>>>((acc, issue) => {
    const field = issue.path[0] as T | undefined;
    if (field && !acc[field]) {
      acc[field] = issue.message;
    }
    return acc;
  }, {});

interface EmployeeUpsertModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  employee?: HrEmployeeRecord | null;
  tenantId: string;
  branches: Branch[];
  roles: Role[];
  paymentSchedules: HrPaymentSchedule[];
  turns: HrTurn[];
  dutiesTypes: HrDutiesType[];
  onClose: () => void;
  onCreate: (payload: CreateUserRequest) => Promise<void>;
  onCreateNoUser: (payload: CreateEmployeeWithContractPayload) => Promise<void>;
  onUpdate: (
    employeeId: string,
    contractId: string,
    payload: {
      employee: UpdateEmployeePayload;
      contract: UpdateContractPayload;
    },
  ) => Promise<void>;
}

export function EmployeeUpsertModal({
  isOpen,
  mode,
  employee,
  tenantId,
  branches,
  roles,
  paymentSchedules,
  turns,
  dutiesTypes,
  onClose,
  onCreate,
  onCreateNoUser,
  onUpdate,
}: EmployeeUpsertModalProps) {
  const [employeeData, setEmployeeData] = useState<EmployeeFields>(
    EMPTY_EMPLOYEE,
  );
  const [contractData, setContractData] = useState<ContractFields>(
    EMPTY_CONTRACT,
  );
  const [accountData, setAccountData] = useState<AccountFields>(EMPTY_ACCOUNT);
  const [withAccount, setWithAccount] = useState(true);
  const [employeeErrors, setEmployeeErrors] = useState<EmployeeErrors>({});
  const [contractErrors, setContractErrors] = useState<ContractErrors>({});
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreate = mode === "create";

  useEffect(() => {
    if (!isOpen) {
      setEmployeeData(EMPTY_EMPLOYEE);
      setContractData(EMPTY_CONTRACT);
      setAccountData(EMPTY_ACCOUNT);
      setWithAccount(true);
      setEmployeeErrors({});
      setContractErrors({});
      setAccountErrors({});
      setIsSubmitting(false);
      return;
    }

    if (!employee || isCreate) {
      setEmployeeData({
        ...EMPTY_EMPLOYEE,
        branch_id: branches[0]?.branch_id ?? "",
        payment_schedule_id: String(
          paymentSchedules[0]?.payment_schedule_id ?? "",
        ),
      });
      setContractData({
        ...EMPTY_CONTRACT,
        turn_id: String(
          turns.find((turn) => turn.branch_id === branches[0]?.branch_id)
            ?.turn_id ?? "",
        ),
      });
      setAccountData(EMPTY_ACCOUNT);
      return;
    }

    setEmployeeData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      document_number: employee.doc_number,
      identification_type_id:
        (employee as HrEmployeeRecord & { identification_type_id?: number })
          .identification_type_id ?? 1,
      phone: employee.phone,
      employee_email: employee.email,
      branch_id: employee.branch_id,
      payment_schedule_id: String(employee.payment_schedule_id),
    });
    setContractData({
      start_date: employee.start_date.slice(0, 10),
      end_date: employee.end_date.slice(0, 10),
      hours: String(employee.hours),
      base_salary: String(employee.base_salary),
      duties: employee.duties ?? "",
      duties_type_id: employee.duties_type_id ? String(employee.duties_type_id) : "",
      turn_type: String(employee.turn_type),
      turn_id: String(employee.turn_id),
    });
  }, [branches, employee, isCreate, isOpen, paymentSchedules, turns]);

  const branchTurns = useMemo(
    () => turns.filter((turn) => turn.branch_id === employeeData.branch_id),
    [employeeData.branch_id, turns],
  );

  useEffect(() => {
    if (!branchTurns.length) {
      setContractData((prev) => ({ ...prev, turn_id: "" }));
      return;
    }

    if (!branchTurns.some((turn) => String(turn.turn_id) === contractData.turn_id)) {
      setContractData((prev) => ({
        ...prev,
        turn_id: String(branchTurns[0].turn_id),
      }));
    }
  }, [branchTurns, contractData.turn_id]);

  const availableRoles = roles.filter((role) => role.role_id !== 1);

  // ── Uniqueness probes ─────────────────────────────────────────────────────
  // Edits exclude the current employee's id so the row's existing values
  // don't flag themselves.
  const excludeEmployeeId = !isCreate ? employee?.employee_id : undefined;

  const checkDoc = useCallback(
    async (value: string) => {
      const { exists } = await employeeApi.checkAvailability({
        field: "doc_number",
        value,
        excludeId: excludeEmployeeId,
      });
      return exists;
    },
    [excludeEmployeeId],
  );

  const checkPhone = useCallback(
    async (value: string) => {
      if (!tenantId) return false;
      const { exists } = await employeeApi.checkAvailability({
        field: "phone",
        value,
        tenantId,
        excludeId: excludeEmployeeId,
      });
      return exists;
    },
    [tenantId, excludeEmployeeId],
  );

  const checkEmployeeEmail = useCallback(
    async (value: string) => {
      const [employeeProbe, userProbe] = await Promise.all([
        employeeApi.checkAvailability({
          field: "email",
          value,
          excludeId: excludeEmployeeId,
        }),
        // Account email collides with users.email globally; in edit mode we
        // can't easily exclude the linked user, so skip the user probe then.
        isCreate
          ? userApi.checkEmailAvailability(value)
          : Promise.resolve({ exists: false }),
      ]);
      return employeeProbe.exists || userProbe.exists;
    },
    [excludeEmployeeId, isCreate],
  );

  const checkAccountEmail = useCallback(async (value: string) => {
    const { exists } = await userApi.checkEmailAvailability(value);
    return exists;
  }, []);

  const docStatus = useUniqueAvailability(
    employeeData.document_number,
    checkDoc,
    { minLength: 3 },
  );

  const phoneStatus = useUniqueAvailability(employeeData.phone, checkPhone, {
    skip: !tenantId,
    minLength: 5,
  });

  const employeeEmailStatus = useUniqueAvailability(
    employeeData.employee_email,
    checkEmployeeEmail,
    {
      minLength: 5,
      isWellFormed: (value) => EMAIL_REGEX.test(value),
    },
  );

  const accountEmailStatus = useUniqueAvailability(
    accountData.email,
    checkAccountEmail,
    {
      skip: !isCreate || !withAccount || !accountData.email,
      minLength: 5,
      isWellFormed: (value) => EMAIL_REGEX.test(value),
    },
  );

  const uniquenessBlocked =
    docStatus === "taken" ||
    phoneStatus === "taken" ||
    employeeEmailStatus === "taken" ||
    (withAccount && accountEmailStatus === "taken");

  const uniquenessProbing =
    docStatus === "checking" ||
    phoneStatus === "checking" ||
    employeeEmailStatus === "checking" ||
    (withAccount && accountEmailStatus === "checking");

  const validateEmployee = () => {
    const result = employeeSchema.safeParse(employeeData);
    if (result.success) {
      setEmployeeErrors({});
      return true;
    }

    setEmployeeErrors(mapZodErrors<keyof EmployeeFields>(result.error.issues));
    return false;
  };

  const validateContract = () => {
    const result = contractSchema.safeParse(contractData);
    if (result.success) {
      setContractErrors({});
      return true;
    }

    setContractErrors(mapZodErrors<keyof ContractFields>(result.error.issues));
    return false;
  };

  const validateAccount = () => {
    if (!isCreate || !withAccount) return true;

    const result = accountSchema.safeParse(accountData);
    if (result.success) {
      setAccountErrors({});
      return true;
    }

    setAccountErrors(mapZodErrors<keyof AccountFields>(result.error.issues));
    return false;
  };

  const handleSubmit = async () => {
    const isEmployeeValid = validateEmployee();
    const isContractValid = validateContract();
    const isAccountValid = validateAccount();

    if (!isEmployeeValid || !isContractValid || !isAccountValid) {
      return;
    }

    if (uniquenessBlocked || uniquenessProbing) {
      return;
    }

    setIsSubmitting(true);

    const contractPayload = {
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      hours: Number(contractData.hours),
      base_salary: Number(contractData.base_salary),
      duties_type_id: contractData.duties_type_id
        ? Number(contractData.duties_type_id)
        : null,
      turn_type: Number(contractData.turn_type),
      turn_id: Number(contractData.turn_id),
    };

    try {
      if (isCreate) {
        if (withAccount) {
          await onCreate({
            tenant_id: tenantId,
            email: accountData.email,
            password: accountData.password,
            role_id: accountData.role_id,
            employeeInfo: {
              tenant_id: tenantId,
              branch_id: employeeData.branch_id,
              first_name: employeeData.first_name,
              last_name: employeeData.last_name,
              doc_number: employeeData.document_number,
              identification_type_id: Number(
                employeeData.identification_type_id,
              ),
              phone: employeeData.phone,
              email: employeeData.employee_email,
              payment_schedule_id: Number(employeeData.payment_schedule_id),
              contractData: contractPayload,
            },
          });
        } else {
          await onCreateNoUser({
            tenant_id: tenantId,
            branch_id: employeeData.branch_id,
            first_name: employeeData.first_name,
            last_name: employeeData.last_name,
            doc_number: employeeData.document_number,
            identification_type_id: Number(employeeData.identification_type_id),
            phone: employeeData.phone,
            email: employeeData.employee_email,
            payment_schedule_id: Number(employeeData.payment_schedule_id),
            contractData: contractPayload,
          });
        }
      } else if (employee) {
        await onUpdate(employee.employee_id, employee.contract_id, {
          employee: {
            first_name: employeeData.first_name,
            last_name: employeeData.last_name,
            doc_number: employeeData.document_number,
            identification_type_id: Number(employeeData.identification_type_id),
            phone: employeeData.phone,
            email: employeeData.employee_email,
            payment_schedule_id: Number(employeeData.payment_schedule_id),
            branch_id: employeeData.branch_id,
          },
          contract: contractPayload,
        });
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? "Nuevo empleado" : "Editar empleado"}
      size="lg"
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Empleado</h3>
            <p className="text-sm text-gray-500">
              Datos básicos y asignación operativa dentro del tenant.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nombre"
              value={employeeData.first_name}
              onChange={(event) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  first_name: event.target.value,
                }))
              }
              error={employeeErrors.first_name}
              required
            />
            <Input
              label="Apellidos"
              value={employeeData.last_name}
              onChange={(event) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  last_name: event.target.value,
                }))
              }
              error={employeeErrors.last_name}
              required
            />
            <Select
              label="Tipo de documento"
              value={String(employeeData.identification_type_id)}
              onChange={(event) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  identification_type_id: Number(event.target.value),
                }))
              }
              options={identificationTypes.map((type) => ({
                value: String(type.value),
                label: type.label,
              }))}
              error={employeeErrors.identification_type_id}
              required
            />
            <Input
              label="Documento"
              value={employeeData.document_number}
              onChange={(event) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  document_number: event.target.value,
                }))
              }
              error={
                employeeErrors.document_number ??
                (docStatus === "taken"
                  ? "Ya existe un empleado con este documento"
                  : undefined)
              }
              hint={
                docStatus === "checking"
                  ? "Verificando disponibilidad…"
                  : docStatus === "available"
                    ? "Documento disponible"
                    : undefined
              }
              required
            />
            <Input
              label="Teléfono"
              value={employeeData.phone}
              onChange={(event) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
              error={
                employeeErrors.phone ??
                (phoneStatus === "taken"
                  ? "Ya existe un empleado con este teléfono"
                  : undefined)
              }
              hint={
                phoneStatus === "checking"
                  ? "Verificando disponibilidad…"
                  : phoneStatus === "available"
                    ? "Teléfono disponible"
                    : undefined
              }
              required
            />
            <Input
              label="Email del empleado"
              type="email"
              value={employeeData.employee_email}
              onChange={(event) => {
                const nextEmail = event.target.value;
                setEmployeeData((prev) => ({
                  ...prev,
                  employee_email: nextEmail,
                }));

                if (isCreate && !accountData.email) {
                  setAccountData((prev) => ({ ...prev, email: nextEmail }));
                }
              }}
              error={
                employeeErrors.employee_email ??
                (employeeEmailStatus === "taken"
                  ? "Ya existe un empleado o usuario con este email"
                  : undefined)
              }
              hint={
                employeeEmailStatus === "checking"
                  ? "Verificando disponibilidad…"
                  : employeeEmailStatus === "available"
                    ? "Email disponible"
                    : undefined
              }
              required
            />
            <Select
              label="Sucursal"
              value={employeeData.branch_id}
              onChange={(event) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  branch_id: event.target.value,
                }))
              }
              options={branches.map((branch) => ({
                value: branch.branch_id,
                label: branch.branch_name,
              }))}
              error={employeeErrors.branch_id}
              required
            />
            <Select
              label="Jornada de pago"
              value={employeeData.payment_schedule_id}
              onChange={(event) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  payment_schedule_id: event.target.value,
                }))
              }
              options={paymentSchedules.map((schedule) => ({
                value: schedule.payment_schedule_id,
                label: `${schedule.description} · ${schedule.daycount} días`,
              }))}
              error={employeeErrors.payment_schedule_id}
              required
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-gray-200 pt-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Contrato</h3>
            <p className="text-sm text-gray-500">
              Condiciones salariales, vigencia y turno asignado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Fecha de inicio"
              type="date"
              value={contractData.start_date}
              onChange={(event) =>
                setContractData((prev) => ({
                  ...prev,
                  start_date: event.target.value,
                }))
              }
              error={contractErrors.start_date}
              required
            />
            <Input
              label="Fecha de fin"
              type="date"
              value={contractData.end_date}
              onChange={(event) =>
                setContractData((prev) => ({
                  ...prev,
                  end_date: event.target.value,
                }))
              }
              error={contractErrors.end_date}
              required
            />
            <Input
              label="Horas semanales"
              type="number"
              min="1"
              value={contractData.hours}
              onChange={(event) =>
                setContractData((prev) => ({
                  ...prev,
                  hours: event.target.value,
                }))
              }
              error={contractErrors.hours}
              required
            />
            <Input
              label="Salario base"
              type="number"
              min="0"
              step="0.01"
              value={contractData.base_salary}
              onChange={(event) =>
                setContractData((prev) => ({
                  ...prev,
                  base_salary: event.target.value,
                }))
              }
              error={contractErrors.base_salary}
              required
            />
            <Input
              label="Horas por turno"
              type="number"
              min="1"
              value={contractData.turn_type}
              onChange={(event) =>
                setContractData((prev) => ({
                  ...prev,
                  turn_type: event.target.value,
                }))
              }
              error={contractErrors.turn_type}
              hint="Este valor se usa en los cálculos de nómina."
              required
            />
            <Select
              label="Turno"
              value={contractData.turn_id}
              onChange={(event) =>
                setContractData((prev) => ({
                  ...prev,
                  turn_id: event.target.value,
                }))
              }
              options={
                branchTurns.length
                  ? branchTurns.map((turn) => ({
                      value: turn.turn_id,
                      label: `${turn.entry.slice(0, 5)} - ${turn.out.slice(0, 5)}`,
                    }))
                  : [{ value: "", label: "No hay turnos para esta sucursal" }]
              }
              error={contractErrors.turn_id}
              required
            />
          </div>

          <Select
            label="Tipo de cargo"
            value={contractData.duties_type_id}
            onChange={(event) =>
              setContractData((prev) => ({
                ...prev,
                duties_type_id: event.target.value,
              }))
            }
            options={
              dutiesTypes.length
                ? dutiesTypes.map((dt) => ({
                    value: String(dt.duties_type_id),
                    label: dt.name,
                  }))
                : [{ value: "", label: "Sin tipos de cargo configurados" }]
            }
            error={contractErrors.duties_type_id}
            required
          />
        </section>

        {isCreate && (
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Cuenta de acceso
                </h3>
                <p className="text-sm text-gray-500">
                  {withAccount
                    ? "El empleado se crea junto con su usuario del sistema."
                    : "Este empleado no tendra acceso al sistema."}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer"
                  checked={withAccount}
                  onChange={(e) => setWithAccount(e.target.checked)}
                />
                Con cuenta
              </label>
            </div>

            {withAccount && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Email de acceso"
                  type="email"
                  value={accountData.email}
                  onChange={(event) =>
                    setAccountData((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  error={
                    accountErrors.email ??
                    (accountEmailStatus === "taken"
                      ? "Ya existe un usuario con este email"
                      : undefined)
                  }
                  hint={
                    accountEmailStatus === "checking"
                      ? "Verificando disponibilidad…"
                      : accountEmailStatus === "available"
                        ? "Email disponible"
                        : undefined
                  }
                  required
                />
                <Select
                  label="Rol"
                  value={accountData.role_id}
                  onChange={(event) =>
                    setAccountData((prev) => ({
                      ...prev,
                      role_id: Number(event.target.value),
                    }))
                  }
                  options={availableRoles.map((role) => ({
                    value: role.role_id,
                    label: capitalize(role.role_name.replace(/_/g, " ")),
                  }))}
                  error={accountErrors.role_id}
                  required
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={accountData.password}
                  onChange={(event) =>
                    setAccountData((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  error={accountErrors.password}
                  required
                />
                <Input
                  label="Confirmar contraseña"
                  type="password"
                  value={accountData.confirmPassword}
                  onChange={(event) =>
                    setAccountData((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  error={accountErrors.confirmPassword}
                  required
                />
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={uniquenessBlocked || uniquenessProbing}
            title={
              uniquenessBlocked
                ? "Hay campos duplicados que deben corregirse"
                : uniquenessProbing
                  ? "Verificando disponibilidad…"
                  : undefined
            }
          >
            {isCreate ? "Crear empleado" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
