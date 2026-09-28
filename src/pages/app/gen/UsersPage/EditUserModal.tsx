import { useEffect, useState } from "react";
import { z } from "zod";

import { branchApi } from "@/api/branch.api";
import { employeeApi } from "@/api/employee.api";

import { contractApi } from "@/api/contract.api";
import { turnsApi } from "@/api/turns.api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { StepIndicator } from "@/components/ui/StepIndicator";

import type { User } from "@/interfaces/entities/User.interface";
import type { Role } from "@/interfaces/entities/Role.interface";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { UpdateUserRequest } from "@/interfaces/api/requests/UpdateUserRequest.interface";
import type {
  HrPaymentSchedule,
  HrTurn,
} from "@/interfaces/entities/Hr.interface";

import { capitalize } from "@/utils/capitalize";
import { contractSchema } from "./newUser.schema";
import { updateUser } from "@/router/actions/user.actions";
import { updateEmployee } from "@/router/actions/employee.actions";
import { updateContract } from "@/router/actions/contract.actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const TURN_TYPES = [
  { value: "1", label: "Rotativo" },
  { value: "2", label: "Fijo" },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const editAccountSchema = z.object({
  email: z.string().trim().min(1, "Requerido").email("Email inválido"),
  role_id: z.number().int().min(1, "Requerido"),
});

const editEmployeeSchema = z.object({
  first_name: z.string().trim().min(1, "Requerido"),
  last_name: z.string().trim().min(1, "Requerido"),
  document_number: z.string().trim().min(1, "Requerido"),
  phone: z.string().trim().min(1, "Requerido"),
  employee_email: z.string().trim().min(1, "Requerido").email("Email inválido"),
  payment_schedule_id: z.string().trim().min(1, "Requerido"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountFields = z.infer<typeof editAccountSchema>;
type EmployeeFields = z.infer<typeof editEmployeeSchema> & {
  branch_id: string;
};
type ContractFields = z.infer<typeof contractSchema>;

type AccountErrors = Partial<Record<keyof AccountFields, string>>;
type EmployeeErrors = Partial<Record<keyof EmployeeFields, string>>;
type ContractErrors = Partial<Record<keyof ContractFields, string>>;

const EMPTY_EMP: EmployeeFields = {
  first_name: "",
  last_name: "",
  document_number: "",
  phone: "",
  employee_email: "",
  branch_id: "",
  payment_schedule_id: "",
};

const EMPTY_CTR: ContractFields = {
  start_date: "",
  end_date: "",
  hours: "",
  base_salary: "",
  duties: "",
  duties_type_id: "",
  turn_type: "1",
  turn_id: "",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  tenantId: string;
  roles: Role[];
  isLoadingRoles: boolean;
  onSubmit: (userId: string, data: UpdateUserRequest) => void;
}

const mapZodErrors = <T extends string>(
  issues: z.ZodIssue[],
): Partial<Record<T, string>> =>
  issues.reduce<Partial<Record<T, string>>>((acc, issue) => {
    const field = issue.path[0] as T | undefined;
    if (field && !acc[field]) acc[field] = issue.message;
    return acc;
  }, {});

// ─── Component ────────────────────────────────────────────────────────────────

export function EditUserModal({
  isOpen,
  onClose,
  user,
  tenantId,
  roles,
  isLoadingRoles,
  onSubmit,
}: EditUserModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmployeeUser, setIsEmployeeUser] = useState(false);

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  const [empData, setEmpData] = useState<EmployeeFields>(EMPTY_EMP);
  const [ctrData, setCtrData] = useState<ContractFields>(EMPTY_CTR);
  const [account, setAccount] = useState<AccountFields>({
    email: "",
    role_id: 2,
  });

  const [empErrors, setEmpErrors] = useState<EmployeeErrors>({});
  const [ctrErrors, setCtrErrors] = useState<ContractErrors>({});
  const [accErrors, setAccErrors] = useState<AccountErrors>({});

  const [branches, setBranches] = useState<Branch[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<HrPaymentSchedule[]>(
    [],
  );
  const [turns, setTurns] = useState<HrTurn[]>([]);

  const availableRoles = roles.filter((r) => r.role_id !== 1);

  // ── Load data on open ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !user) return;

    setIsLoading(true);
    setStep(1);
    setEmpErrors({});
    setCtrErrors({});
    setAccErrors({});

    setAccount({ email: user.email, role_id: user.role_id });

    Promise.all([
      branchApi.listByTenant(tenantId),
      contractApi.getPaymentSchedules(),
      employeeApi.getByUserId(user.user_id),
    ])
      .then(([branchRes, schedules, empDetail]) => {
        setBranches(branchRes.branches);
        setPaymentSchedules(schedules);
        setIsEmployeeUser(Boolean(empDetail));

        if (empDetail) {
          setEmployeeId(empDetail.employee_id);
          setContractId(empDetail.contract_id);
          setEmpData({
            first_name: empDetail.first_name,
            last_name: empDetail.last_name,
            document_number: empDetail.doc_number,
            phone: empDetail.phone,
            employee_email: empDetail.email,
            branch_id: empDetail.branch_id,
            payment_schedule_id: String(empDetail.payment_schedule_id),
          });
          setCtrData({
            start_date: empDetail.start_date.substring(0, 10),
            end_date: empDetail.end_date.substring(0, 10),
            hours: String(empDetail.hours),
            base_salary: String(empDetail.base_salary),
            duties: empDetail.duties ?? "",
            duties_type_id: empDetail.duties_type_id
              ? String(empDetail.duties_type_id)
              : "",
            turn_type: String(empDetail.turn_type),
            turn_id: String(empDetail.turn_id),
          });
        } else {
          setEmployeeId(null);
          setContractId(null);
          setEmpData(EMPTY_EMP);
          setCtrData(EMPTY_CTR);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isOpen, user, tenantId]);

  // Load turns when branch changes
  useEffect(() => {
    if (!empData.branch_id) {
      setTurns([]);
      return;
    }
    turnsApi.listByBranch(empData.branch_id).then(setTurns).catch(console.error);
  }, [empData.branch_id]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setIsEmployeeUser(false);
      setEmployeeId(null);
      setContractId(null);
      setEmpData(EMPTY_EMP);
      setCtrData(EMPTY_CTR);
      setAccount({ email: "", role_id: 2 });
      setEmpErrors({});
      setCtrErrors({});
      setAccErrors({});
      setBranches([]);
      setPaymentSchedules([]);
      setTurns([]);
    }
  }, [isOpen]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateEmployee = (): boolean => {
    const result = editEmployeeSchema.safeParse(empData);
    if (result.success) {
      setEmpErrors({});
      return true;
    }
    setEmpErrors(mapZodErrors<keyof EmployeeFields>(result.error.issues));
    return false;
  };

  const validateContract = (): boolean => {
    const result = contractSchema.safeParse(ctrData);
    if (result.success) {
      setCtrErrors({});
      return true;
    }
    setCtrErrors(mapZodErrors<keyof ContractFields>(result.error.issues));
    return false;
  };

  const validateAccount = (): boolean => {
    const result = editAccountSchema.safeParse(account);
    if (result.success) {
      setAccErrors({});
      return true;
    }
    setAccErrors(mapZodErrors<keyof AccountFields>(result.error.issues));
    return false;
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const totalSteps = isEmployeeUser ? 3 : 1;
  const stepLabels = isEmployeeUser
    ? ["Empleado", "Contrato", "Cuenta"]
    : ["Cuenta"];

  const handleNext = () => {
    if (isEmployeeUser && step === 1 && !validateEmployee()) return;
    if (isEmployeeUser && step === 2 && !validateContract()) return;
    setStep((s) => Math.min(s + 1, totalSteps) as 1 | 2 | 3);
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateAccount() || !user) return;

    setIsSubmitting(true);
    try {
      if (isEmployeeUser && employeeId && contractId) {
        await Promise.all([
          updateEmployee(employeeId, {
            first_name: empData.first_name,
            last_name: empData.last_name,
            doc_number: empData.document_number,
            phone: empData.phone,
            email: empData.employee_email,
            payment_schedule_id: Number(empData.payment_schedule_id),
          }),
          updateContract(contractId, {
            start_date: ctrData.start_date,
            end_date: ctrData.end_date,
            hours: Number(ctrData.hours),
            base_salary: Number(ctrData.base_salary),
            duties_type_id: ctrData.duties_type_id
              ? Number(ctrData.duties_type_id)
              : null,
            turn_type: Number(ctrData.turn_type),
            turn_id: Number(ctrData.turn_id),
          }),
          updateUser(user.user_id, {
            email: account.email,
            role_id: account.role_id,
          }),
        ]);
      }

      onSubmit(user.user_id, {
        email: account.email,
        role_id: account.role_id,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Section renders ────────────────────────────────────────────────────────

  const renderEmployeeSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre"
          value={empData.first_name}
          onChange={(e) =>
            setEmpData((p) => ({ ...p, first_name: e.target.value }))
          }
          error={empErrors.first_name}
          required
        />
        <Input
          label="Apellidos"
          value={empData.last_name}
          onChange={(e) =>
            setEmpData((p) => ({ ...p, last_name: e.target.value }))
          }
          error={empErrors.last_name}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Número de documento"
          value={empData.document_number}
          onChange={(e) =>
            setEmpData((p) => ({ ...p, document_number: e.target.value }))
          }
          error={empErrors.document_number}
          required
        />
        <Input
          label="Teléfono"
          value={empData.phone}
          onChange={(e) => setEmpData((p) => ({ ...p, phone: e.target.value }))}
          error={empErrors.phone}
          required
        />
      </div>
      <Input
        label="Email del empleado"
        type="email"
        value={empData.employee_email}
        onChange={(e) =>
          setEmpData((p) => ({ ...p, employee_email: e.target.value }))
        }
        error={empErrors.employee_email}
        required
      />
      <Select
        label="Sucursal"
        value={empData.branch_id}
        options={branches.map((b) => ({
          value: b.branch_id,
          label: b.branch_name,
        }))}
        disabled
      />
      <Select
        label="Jornada de pago"
        value={empData.payment_schedule_id}
        onChange={(e) =>
          setEmpData((p) => ({ ...p, payment_schedule_id: e.target.value }))
        }
        options={paymentSchedules.map((s) => ({
          value: String(s.payment_schedule_id),
          label: `${s.description} · ${s.daycount} días`,
        }))}
        error={empErrors.payment_schedule_id}
        required
      />
    </div>
  );

  const renderContractSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Fecha de inicio"
          type="date"
          value={ctrData.start_date}
          onChange={(e) =>
            setCtrData((p) => ({ ...p, start_date: e.target.value }))
          }
          error={ctrErrors.start_date}
          required
        />
        <Input
          label="Fecha de fin"
          type="date"
          value={ctrData.end_date}
          onChange={(e) =>
            setCtrData((p) => ({ ...p, end_date: e.target.value }))
          }
          error={ctrErrors.end_date}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Horas semanales"
          type="number"
          value={ctrData.hours}
          onChange={(e) => setCtrData((p) => ({ ...p, hours: e.target.value }))}
          error={ctrErrors.hours}
          required
        />
        <Input
          label="Salario base"
          type="number"
          value={ctrData.base_salary}
          onChange={(e) =>
            setCtrData((p) => ({ ...p, base_salary: e.target.value }))
          }
          error={ctrErrors.base_salary}
          required
        />
      </div>
      <Input
        label="Cargo / Funciones"
        value={ctrData.duties}
        onChange={(e) => setCtrData((p) => ({ ...p, duties: e.target.value }))}
        error={ctrErrors.duties}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Tipo de turno"
          value={ctrData.turn_type}
          onChange={(e) =>
            setCtrData((p) => ({ ...p, turn_type: e.target.value }))
          }
          options={TURN_TYPES}
          error={ctrErrors.turn_type}
          required
        />
        <Select
          label="Turno"
          value={ctrData.turn_id}
          onChange={(e) =>
            setCtrData((p) => ({ ...p, turn_id: e.target.value }))
          }
          options={turns.map((t) => ({
            value: String(t.turn_id),
            label: `${t.entry.slice(0, 5)} - ${t.out.slice(0, 5)}`,
          }))}
          error={ctrErrors.turn_id}
          required
        />
      </div>
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-4">
      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        La contraseña solo puede ser modificada por el propio usuario desde su
        perfil.
      </p>
      <Input
        label="Email de acceso"
        type="email"
        placeholder="usuario@empresa.com"
        value={account.email}
        onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))}
        error={accErrors.email}
        required
      />
      {isLoadingRoles ? (
        <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
          <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          Cargando roles…
        </div>
      ) : (
        <Select
          label="Rol"
          value={account.role_id}
          onChange={(e) =>
            setAccount((p) => ({ ...p, role_id: parseInt(e.target.value) }))
          }
          options={availableRoles.map((r) => ({
            value: r.role_id,
            label: capitalize(r.role_name.replace(/_/g, " ")),
          }))}
          error={accErrors.role_id}
          required
        />
      )}
    </div>
  );

  const renderSection = () => {
    if (isEmployeeUser && step === 1) return renderEmployeeSection();
    if (isEmployeeUser && step === 2) return renderContractSection();
    return renderAccountSection();
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Usuario" size="md">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <StepIndicator currentStep={step} labels={stepLabels} />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            {stepLabels[step - 1]}
          </p>

          {renderSection()}

          <div className="flex gap-3 pt-5 mt-5 border-t border-gray-200">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Anterior
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            )}

            <div className="flex-1" />

            {step < totalSteps ? (
              <Button type="button" variant="primary" onClick={handleNext}>
                Siguiente
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Guardar cambios
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </>
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
