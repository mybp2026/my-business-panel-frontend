import { useEffect, useMemo, useState } from "react";

import { authApi, employeeApi, hrBeneficiariesApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import { IconPlus } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrBeneficiaryRelationship,
  HrEmployeeBeneficiary,
  HrEmployeeRecord,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);

const RELATIONSHIP_OPTIONS: { value: HrBeneficiaryRelationship; label: string }[] = [
  { value: "hijo", label: "Hijo/a" },
  { value: "conyuge", label: "Cónyuge" },
  { value: "pareja_estable", label: "Pareja estable" },
  { value: "padre", label: "Padre" },
  { value: "madre", label: "Madre" },
  { value: "nieto_huerfano", label: "Nieto/a huérfano/a" },
];

const RELATIONSHIP_LABEL: Record<HrBeneficiaryRelationship, string> = {
  hijo: "Hijo/a",
  conyuge: "Cónyuge",
  pareja_estable: "Pareja estable",
  padre: "Padre",
  madre: "Madre",
  nieto_huerfano: "Nieto/a huérfano/a",
};

export function HRBeneficiariesPage() {
  const [employees, setEmployees] = useState<HrEmployeeRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<HrEmployeeBeneficiary[]>(
    [],
  );
  const [claimWindow, setClaimWindow] = useState<{
    opensAt?: string;
    closesAt?: string;
  } | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    doc_number: "",
    relationship: "hijo" as HrBeneficiaryRelationship,
    claim_date: todayIso(),
  });

  const [distributeForm, setDistributeForm] = useState({
    settlement_id: "",
    recalculate: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ mode: ToastMode; message: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const currentUser = await authApi.getCurrentUser();
      const tenantId = currentUser?.tenant?.tenant_id ?? "";
      if (!tenantId) return;
      setEmployees(await employeeApi.listByTenant(tenantId));
    })();
  }, []);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.employee_id,
        label: `${e.first_name} ${e.last_name}`,
      })),
    [employees],
  );

  const reload = async (empId: string) => {
    if (!empId) return;
    setIsLoading(true);
    try {
      const [list, window_] = await Promise.all([
        hrBeneficiariesApi.list(empId),
        hrBeneficiariesApi.claimWindow(empId).catch(() => null),
      ]);
      setBeneficiaries(list);
      setClaimWindow(window_);
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
      setBeneficiaries([]);
      setClaimWindow(null);
    }
  }, [employeeId]);

  const handleCreate = async () => {
    if (!employeeId) return;
    if (!form.full_name.trim() || !form.doc_number.trim()) {
      setToast({ mode: "error", message: "Nombre y documento son requeridos" });
      return;
    }
    setIsSubmitting(true);
    try {
      await hrBeneficiariesApi.create({
        employee_id: employeeId,
        full_name: form.full_name.trim(),
        doc_number: form.doc_number.trim(),
        relationship: form.relationship,
        claim_date: form.claim_date,
      });
      setForm({
        full_name: "",
        doc_number: "",
        relationship: "hijo",
        claim_date: todayIso(),
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Beneficiario registrado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error registrando beneficiario",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async (beneficiaryId: string) => {
    setIsSubmitting(true);
    try {
      await hrBeneficiariesApi.validate(beneficiaryId, todayIso());
      await reload(employeeId);
      setToast({ mode: "success", message: "Beneficiario validado" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error validando beneficiario",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDistribute = async () => {
    if (!employeeId || !distributeForm.settlement_id.trim()) {
      setToast({ mode: "error", message: "Ingresa el ID de la liquidación a distribuir" });
      return;
    }
    setIsSubmitting(true);
    try {
      await hrBeneficiariesApi.distribute(employeeId, {
        settlement_id: distributeForm.settlement_id.trim(),
        recalculate: distributeForm.recalculate,
      });
      await reload(employeeId);
      setToast({ mode: "success", message: "Liquidación distribuida correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error distribuyendo la liquidación",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column[] = [
    { key: "full_name", label: "Nombre", width: "26%" },
    {
      key: "relationship",
      label: "Parentesco",
      width: "18%",
      render: (value: HrBeneficiaryRelationship) => RELATIONSHIP_LABEL[value],
    },
    {
      key: "share_percentage",
      label: "% participación",
      width: "16%",
      render: (value: number | string | null) => (
        <span className="font-mono">
          {value ? `${Number(value).toFixed(2)}%` : "—"}
        </span>
      ),
    },
    {
      key: "share_amount",
      label: "Monto",
      width: "16%",
      render: (value: number | string | null) => (
        <span className="font-mono">
          {value
            ? Number(value).toLocaleString("es-VE", { minimumFractionDigits: 2 })
            : "—"}
        </span>
      ),
    },
    {
      key: "validated",
      label: "Validado",
      width: "10%",
      render: (value: boolean) => (
        <Badge variant={value ? "green" : "gray"}>{value ? "Sí" : "No"}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "14%",
      render: (_v: unknown, row: HrEmployeeBeneficiary) =>
        !row.validated && (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleValidate(row.beneficiary_id)}
              loading={isSubmitting}
            >
              Validar
            </Button>
          </div>
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

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Beneficiarios
        </h1>
        <p className="text-gray-600">
          Distribución de prestaciones por fallecimiento en partes iguales,
          sin preferencia entre parentescos (Art. 145).
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <Select
          label="Empleado"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={employeeOptions}
          placeholder="Selecciona un empleado"
        />
      </div>

      {employeeId && (
        <>
          {claimWindow?.opensAt && (
            <div className="mb-6 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Ventana de reclamo: {claimWindow.opensAt.slice(0, 10)} —{" "}
              {claimWindow.closesAt?.slice(0, 10)}
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Registrar beneficiario
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Nombre completo"
                value={form.full_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, full_name: e.target.value }))
                }
              />
              <Input
                label="Número de documento"
                value={form.doc_number}
                onChange={(e) =>
                  setForm((p) => ({ ...p, doc_number: e.target.value }))
                }
              />
              <Select
                label="Parentesco"
                value={form.relationship}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    relationship: e.target.value as HrBeneficiaryRelationship,
                  }))
                }
                options={RELATIONSHIP_OPTIONS}
              />
              <Input
                label="Fecha de reclamo"
                type="date"
                value={form.claim_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, claim_date: e.target.value }))
                }
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreate} loading={isSubmitting}>
                <IconPlus />
                Registrar
              </Button>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
            <Table
              columns={columns}
              data={beneficiaries}
              isLoading={isLoading}
              emptyMessage="No hay beneficiarios registrados."
            />
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Distribuir liquidación entre beneficiarios validados
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <Input
                label="ID de liquidación"
                value={distributeForm.settlement_id}
                onChange={(e) =>
                  setDistributeForm((p) => ({
                    ...p,
                    settlement_id: e.target.value,
                  }))
                }
              />
              <Select
                label="Recalcular"
                value={distributeForm.recalculate ? "yes" : "no"}
                onChange={(e) =>
                  setDistributeForm((p) => ({
                    ...p,
                    recalculate: e.target.value === "yes",
                  }))
                }
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />
              <Button
                variant="secondary"
                onClick={handleDistribute}
                loading={isSubmitting}
              >
                Distribuir
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
