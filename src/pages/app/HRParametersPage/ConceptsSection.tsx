import { useEffect, useState } from "react";

import { conceptApi } from "@/api/concept.api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";

import { IconCreditCard, IconEdit, IconPlus, IconTrash } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  CreateHrConceptPayload,
  HrPayrollConcept,
  UpdateHrConceptPayload,
} from "@/interfaces/entities/Hr.interface";

import { ConceptUpsertModal } from "./ConceptUpsertModal";

const formatCurrency = (value: number) =>
  `Bs. ${Number(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Catalogo tenant-wide de conceptos de nomina (ingresos/deducciones y su
 * metodo de calculo) usado por el motor de la corrida mensual. No es
 * donde se cargan montos por empleado -- eso vive en Novedades de nomina
 * (Horas con recargo, Deducciones), que alimentan el paysheet al
 * procesar. Este catalogo solo define QUE existe y COMO se calcula.
 */
export function ConceptsSection() {
  const { user } = useAuth();
  const tenantId = user?.tenant.tenant_id ?? "";

  const [concepts, setConcepts] = useState<HrPayrollConcept[]>([]);
  const [selectedConcept, setSelectedConcept] =
    useState<HrPayrollConcept | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const refreshConcepts = async () => {
    if (!tenantId) return;
    const nextConcepts = await conceptApi.listByTenant(tenantId);
    setConcepts(nextConcepts);
  };

  useEffect(() => {
    if (!tenantId) return;
    setIsLoading(true);
    conceptApi
      .listByTenant(tenantId)
      .then(async (list) => {
        setConcepts(list);
        if (list.length === 0) {
          const result = await conceptApi.provisionDefaults();
          if (result.created > 0) {
            await refreshConcepts();
            setToast({ mode: "success", message: result.message });
          }
        }
      })
      .catch((error) => {
        setToast({
          mode: "error",
          message:
            error instanceof Error
              ? error.message
              : "Error cargando conceptos",
        });
      })
      .finally(() => setIsLoading(false));
    // Solo en mount / cambio de tenant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleCreateConcept = async (payload: CreateHrConceptPayload) => {
    try {
      await conceptApi.create(payload);
      await refreshConcepts();
      setToast({ mode: "success", message: "Concepto creado correctamente" });
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
      setToast({ mode: "success", message: "Concepto eliminado correctamente" });
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

  const columns: Column[] = [
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

  const activeConcepts = concepts.filter((c) => c.is_active !== false);

  return (
    <>
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        Catálogo de ingresos y deducciones que usa el motor de cálculo al
        procesar una nómina. Registrar horas con recargo o deducciones de un
        empleado se hace en <strong>Novedades de nómina</strong> — aquí solo
        se define qué conceptos existen y cómo se calculan.
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Conceptos de nómina
            </h2>
            <p className="text-sm text-gray-500">
              {activeConcepts.length} activos de {concepts.length} totales.
            </p>
          </div>
          <Button onClick={() => setSelectedConcept({} as HrPayrollConcept)}>
            <IconPlus />
            Nuevo concepto
          </Button>
        </div>

        <Table
          columns={columns}
          data={concepts}
          isLoading={isLoading}
          emptyMessage="No hay conceptos registrados. Espere la carga automática o cree uno manualmente."
        />
      </div>

      <ConceptUpsertModal
        isOpen={selectedConcept !== null}
        tenantId={tenantId}
        concept={selectedConcept && selectedConcept.concept_id ? selectedConcept : null}
        onClose={() => setSelectedConcept(null)}
        onCreate={handleCreateConcept}
        onUpdate={handleUpdateConcept}
      />
    </>
  );
}
