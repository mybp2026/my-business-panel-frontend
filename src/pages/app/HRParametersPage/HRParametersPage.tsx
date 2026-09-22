import { useEffect, useMemo, useState } from "react";

import { hrParametersApi } from "@/api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";

import { IconPlus, IconSettings } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { HrPayrollParameter } from "@/interfaces/entities/Hr.interface";

import { ConceptsSection } from "./ConceptsSection";

const todayIso = () => new Date().toISOString().slice(0, 10);

// Catalogo de claves conocidas por hr_schema.payroll_parameters (LOTTT).
// tasa_activa_bcv y salario_minimo_nacional no tienen piso legal fijo
// (dependen de BCV/decreto) y son obligatorias para operar; el resto
// son pisos legales que una convencion colectiva solo puede mejorar.
const PARAM_CATALOG: Record<string, { label: string; article: string }> = {
  tasa_activa_bcv: {
    label: "Tasa activa BCV (mora)",
    article: "Arts. 128, 142.f, 143",
  },
  salario_minimo_nacional: {
    label: "Salario mínimo nacional",
    article: "Art. 129",
  },
  tasa_promedio_activa_pasiva_bcv: {
    label: "Tasa promedio activa/pasiva BCV",
    article: "Art. 143",
  },
  dias_utilidades: { label: "Días de utilidades", article: "Art. 131" },
  dias_bono_vacacional_base: {
    label: "Días de bono vacacional (base)",
    article: "Art. 192",
  },
  dias_vacaciones_base: {
    label: "Días de vacaciones (base)",
    article: "Art. 190",
  },
  recargo_nocturno: { label: "Recargo nocturno", article: "Art. 117" },
  recargo_hora_extra: { label: "Recargo hora extra", article: "Art. 118" },
  recargo_feriado: {
    label: "Recargo feriado / descanso",
    article: "Art. 120",
  },
  porcentaje_prestaciones_utilidades: {
    label: "% de beneficios líquidos repartibles",
    article: "Art. 131",
  },
  dias_garantia_trimestral: {
    label: "Días de garantía trimestral",
    article: "Art. 142.a",
  },
  dias_adicionales_por_anio: {
    label: "Días adicionales por año (antigüedad)",
    article: "Art. 142.b",
  },
  tope_dias_adicionales: {
    label: "Tope de días adicionales",
    article: "Art. 142.b",
  },
  dias_retroactivo_por_anio: {
    label: "Días de retroactivo por año",
    article: "Art. 142.c",
  },
  dias_por_mes_antiguedad_corta: {
    label: "Días por mes (antigüedad < 3 meses)",
    article: "Art. 142.e",
  },
  tope_anticipo_prestaciones: {
    label: "Tope de anticipo sobre garantía",
    article: "Art. 144",
  },
  tope_descuento_periodo: {
    label: "Tope de descuento por período",
    article: "Art. 154",
  },
  tope_compensacion_liquidacion: {
    label: "Tope de compensación en liquidación",
    article: "Art. 154",
  },
  dias_gracia_pago_prestaciones: {
    label: "Días de gracia para pago de prestaciones",
    article: "Art. 142.f",
  },
  tope_horas_dia: {
    label: "Tope de horas extra por día",
    article: "Art. 178",
  },
  tope_horas_extra_semana: {
    label: "Tope de horas extra por semana",
    article: "Art. 178",
  },
  tope_horas_extra_anio: {
    label: "Tope de horas extra por año",
    article: "Art. 178",
  },
  dias_anio_comercial: {
    label: "Días del año comercial",
    article: "Art. 122",
  },
  divisor_salario_diario: {
    label: "Divisor del salario diario",
    article: "Art. 113",
  },
};

const paramLabel = (key: string) => PARAM_CATALOG[key]?.label ?? key;

const formatValue = (value: number | string) =>
  Number(value).toLocaleString("es-VE", { maximumFractionDigits: 6 });

export function HRParametersPage() {
  const { user } = useAuth();
  const canEdit =
    user?.role.role_name === "admin" || user?.role.role_name === "superuser";

  const [parameters, setParameters] = useState<HrPayrollParameter[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ mode: ToastMode; message: string } | null>(
    null,
  );

  const [form, setForm] = useState({
    param_key: "",
    param_value: "",
    valid_from: todayIso(),
    source: "",
  });

  const [activeTab, setActiveTab] = useState<"legal" | "concepts">("legal");

  const paramOptions = useMemo(
    () =>
      Object.entries(PARAM_CATALOG).map(([value, meta]) => ({
        value,
        label: `${meta.label} (${meta.article})`,
      })),
    [],
  );

  const reload = async () => {
    setIsLoading(true);
    try {
      const today = todayIso();
      const [parameterList, missingResult] = await Promise.all([
        hrParametersApi.listByTenant(),
        hrParametersApi.listMissing(today),
      ]);
      setParameters(parameterList);
      setMissing(missingResult.missing);
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error cargando parámetros",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const currentByKey = useMemo(() => {
    const today = todayIso();
    const map = new Map<string, HrPayrollParameter>();
    for (const p of parameters) {
      if (p.valid_from > today) continue;
      if (p.valid_to && p.valid_to < today) continue;
      const existing = map.get(p.param_key);
      if (!existing || p.valid_from > existing.valid_from) {
        map.set(p.param_key, p);
      }
    }
    return map;
  }, [parameters]);

  const history = useMemo(
    () =>
      [...parameters].sort((a, b) => {
        if (a.param_key !== b.param_key) {
          return a.param_key.localeCompare(b.param_key);
        }
        return b.valid_from.localeCompare(a.valid_from);
      }),
    [parameters],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!form.param_key) {
      setToast({ mode: "error", message: "Selecciona un parámetro" });
      return;
    }
    const value = parseFloat(form.param_value);
    if (!form.param_value || Number.isNaN(value) || value < 0) {
      setToast({ mode: "error", message: "Ingresa un valor numérico válido" });
      return;
    }

    setIsSubmitting(true);
    try {
      await hrParametersApi.create({
        param_key: form.param_key,
        param_value: value,
        valid_from: form.valid_from,
        source: form.source.trim() || undefined,
      });
      setForm((p) => ({ ...p, param_value: "", source: "" }));
      await reload();
      setToast({ mode: "success", message: "Parámetro guardado correctamente" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error guardando parámetro",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiredCurrent = ["tasa_activa_bcv", "salario_minimo_nacional"];

  const columns: Column[] = [
    {
      key: "param_key",
      label: "Parámetro",
      width: "30%",
      render: (value: string) => paramLabel(value),
    },
    {
      key: "param_value",
      label: "Valor",
      width: "15%",
      render: (value: number | string) => (
        <span className="font-mono">{formatValue(value)}</span>
      ),
    },
    {
      key: "valid_from",
      label: "Vigente desde",
      width: "18%",
      render: (value: string) => value.slice(0, 10),
    },
    {
      key: "valid_to",
      label: "Vigente hasta",
      width: "18%",
      render: (value: string | null) => (value ? value.slice(0, 10) : "vigente"),
    },
    { key: "source", label: "Fuente", width: "19%" },
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
          Configuración de nómina
        </h1>
        <p className="text-gray-600">
          Pisos legales con vigencia por fecha y catálogo de conceptos que usa
          el motor de cálculo — configuración de una sola vez por tenant, no
          por período.
        </p>
      </div>

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: "legal", label: "Parámetros legales" },
            { id: "concepts", label: "Conceptos de nómina" },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as "legal" | "concepts")}
        />
      </div>

      {activeTab === "concepts" && <ConceptsSection />}

      {activeTab === "legal" && missing.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="mb-1 font-semibold">
            Faltan parámetros obligatorios para hoy
          </p>
          <p>
            Sin estos valores, prestaciones y mora fallarán al calcularse:{" "}
            {missing.map((key) => paramLabel(key)).join(", ")}.
          </p>
        </div>
      )}

      {activeTab === "legal" && (
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {requiredCurrent.map((key) => {
          const current = currentByKey.get(key);
          return (
            <StatCard
              key={key}
              label={paramLabel(key)}
              value={current ? formatValue(current.param_value) : "—"}
              sublabel={
                current
                  ? `Vigente desde ${current.valid_from.slice(0, 10)}`
                  : "Sin valor vigente"
              }
              icon={<IconSettings />}
              accent
            />
          );
        })}
      </div>
      )}

      {activeTab === "legal" && canEdit && (
        <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Cargar nuevo valor / vigencia
          </h2>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-4 lg:grid-cols-4"
          >
            <Select
              label="Parámetro"
              value={form.param_key}
              onChange={(e) =>
                setForm((p) => ({ ...p, param_key: e.target.value }))
              }
              options={paramOptions}
              placeholder="Selecciona un parámetro"
              required
            />
            <Input
              label="Valor"
              type="number"
              step="0.000001"
              min="0"
              placeholder="Ej: 0.72 ó 130"
              value={form.param_value}
              onChange={(e) =>
                setForm((p) => ({ ...p, param_value: e.target.value }))
              }
              required
            />
            <Input
              label="Vigente desde"
              type="date"
              value={form.valid_from}
              onChange={(e) =>
                setForm((p) => ({ ...p, valid_from: e.target.value }))
              }
              required
            />
            <Input
              label="Fuente"
              placeholder="Ej: Aviso BCV agosto 2026"
              value={form.source}
              onChange={(e) =>
                setForm((p) => ({ ...p, source: e.target.value }))
              }
              hint="Origen del dato, para auditoría."
            />
            <div className="flex items-end lg:col-span-4">
              <Button type="submit" loading={isSubmitting}>
                <IconPlus />
                Guardar parámetro
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "legal" && (
      <div className="rounded-2xl border border-gray-300 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Historial de vigencias
        </h2>
        <Table
          columns={columns}
          data={history}
          isLoading={isLoading}
          emptyMessage="No hay parámetros registrados todavía."
        />
      </div>
      )}
    </div>
  );
}
