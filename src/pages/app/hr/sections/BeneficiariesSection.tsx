import { useEffect, useState } from "react";

import { hrBeneficiariesApi, hrSettlementApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { useHrEmployee } from "@/context/HrEmployeeContext";

import { IconPlus } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  HrBeneficiaryRelationship,
  HrClaimWindow,
  HrEmployeeBeneficiary,
  HrSettlement,
} from "@/interfaces/entities/Hr.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);

const RELATIONSHIP_OPTIONS: {
  value: HrBeneficiaryRelationship;
  label: string;
}[] = [
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

export function BeneficiariesSection() {
  const { employeeId } = useHrEmployee();

  const [beneficiaries, setBeneficiaries] = useState<HrEmployeeBeneficiary[]>(
    [],
  );
  const [claimWindow, setClaimWindow] = useState<HrClaimWindow | null>(null);
  const [settlements, setSettlements] = useState<HrSettlement[]>([]);

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
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const reload = async (empId: string) => {
    if (!empId) return;
    setIsLoading(true);
    try {
      const [list, window_, overdue] = await Promise.all([
        hrBeneficiariesApi.list(empId),
        hrBeneficiariesApi.claimWindow(empId).catch(() => null),
        hrSettlementApi.overdue().catch(() => [] as HrSettlement[]),
      ]);
      setBeneficiaries(list);
      setClaimWindow(window_);
      setSettlements(overdue.filter((s) => s.employee_id === empId));
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
      setSettlements([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setToast({
        mode: "success",
        message: "Beneficiario registrado correctamente",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error registrando beneficiario",
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
          error instanceof Error
            ? error.message
            : "Error validando beneficiario",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDistribute = async () => {
    if (!employeeId || !distributeForm.settlement_id.trim()) {
      setToast({
        mode: "error",
        message: "Selecciona la liquidación a distribuir",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await hrBeneficiariesApi.distribute(employeeId, {
        settlement_id: distributeForm.settlement_id.trim(),
        recalculate: distributeForm.recalculate,
      });
      await reload(employeeId);
      setToast({
        mode: "success",
        message: `Repartido entre ${result.count} beneficiarios validados: ${Number(
          result.sharePercentage,
        ).toFixed(2)}% cada uno (${Number(result.shareAmount).toLocaleString(
          "es-VE",
          { minimumFractionDigits: 2 },
        )} por cabeza)`,
      });
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
            ? Number(value).toLocaleString("es-VE", {
                minimumFractionDigits: 2,
              })
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

  const settlementOptions = settlements.length
    ? settlements.map((s) => ({
        value: s.settlement_id,
        label: `${s.termination_date.slice(0, 10)} · ${Number(
          s.total ?? 0,
        ).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
      }))
    : [{ value: "", label: "Sin liquidaciones pendientes de reparto" }];

  return (
    <>
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {claimWindow && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
            claimWindow.deadline && !claimWindow.open
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-gray-200 bg-gray-50 text-gray-700"
          }`}
        >
          {claimWindow.deadline ? (
            <>
              <span className="font-medium">
                Ventana de reclamo (3 meses, Art. 145):
              </span>{" "}
              {claimWindow.terminationDate?.slice(0, 10)} —{" "}
              {claimWindow.deadline.slice(0, 10)}{" "}
              <Badge variant={claimWindow.open ? "green" : "red"}>
                {claimWindow.open ? "Abierta" : "Cerrada"}
              </Badge>
              <span className="ml-3 text-gray-500">
                {claimWindow.validatedClaimants} validados ·{" "}
                {claimWindow.pendingClaimants} por validar
              </span>
            </>
          ) : (
            <>
              El trabajador no tiene egreso registrado, por lo que la ventana de
              3 meses del Art. 145 aun no empieza a correr. Registrar el egreso
              en la pestaña de liquidación.
            </>
          )}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          Registrar beneficiario
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          El reparto es en partes iguales entre los reclamantes validados, sin
          preferencia entre parentescos (Art. 145).
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nombre completo"
            value={form.full_name}
            onChange={(e) =>
              setForm((p) => ({ ...p, full_name: e.target.value }))
            }
            required
          />
          <Input
            label="Número de documento"
            value={form.doc_number}
            onChange={(e) =>
              setForm((p) => ({ ...p, doc_number: e.target.value }))
            }
            required
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
            required
          />
          <Input
            label="Fecha de reclamo"
            type="date"
            value={form.claim_date}
            onChange={(e) =>
              setForm((p) => ({ ...p, claim_date: e.target.value }))
            }
            required
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
          <Select
            label="Liquidación"
            value={distributeForm.settlement_id}
            onChange={(e) =>
              setDistributeForm((p) => ({
                ...p,
                settlement_id: e.target.value,
              }))
            }
            options={settlementOptions}
            placeholder="Selecciona una liquidación"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">
              Recalcular reparto
            </span>
            <span className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-accent-white px-4 py-2.5">
              <input
                type="checkbox"
                checked={distributeForm.recalculate}
                onChange={(e) =>
                  setDistributeForm((p) => ({
                    ...p,
                    recalculate: e.target.checked,
                  }))
                }
                className="h-4 w-4 shrink-0 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                Rehacer el reparto si cambió el número de validados
              </span>
            </span>
          </label>
          <Button onClick={handleDistribute} loading={isSubmitting}>
            Distribuir
          </Button>
        </div>
      </div>
    </>
  );
}
