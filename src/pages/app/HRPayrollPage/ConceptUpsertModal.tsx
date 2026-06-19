import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

import type {
  CreateHrConceptPayload,
  HrPayrollConcept,
  UpdateHrConceptPayload,
} from "@/interfaces/entities/Hr.interface";

interface ConceptUpsertModalProps {
  isOpen: boolean;
  tenantId: string;
  concept: HrPayrollConcept | null;
  onClose: () => void;
  onCreate: (payload: CreateHrConceptPayload) => Promise<void>;
  onUpdate: (
    conceptId: number,
    payload: UpdateHrConceptPayload,
  ) => Promise<void>;
}

type CalcMethod = "fixed" | "percentage" | "formula" | "manual";

const TYPE_OPTIONS = [
  { value: "earning", label: "Ingreso (suma al pago)" },
  { value: "deduction", label: "Deducción (resta del pago)" },
];

const METHOD_OPTIONS = [
  { value: "fixed", label: "Fijo (monto en ₡)" },
  { value: "percentage", label: "Porcentaje del salario" },
  { value: "formula", label: "Fórmula del sistema" },
  { value: "manual", label: "Manual (se ingresa al procesar)" },
];

const METHOD_HINTS: Record<CalcMethod, string> = {
  fixed: "Monto fijo en colones (₡) que se aplica tal cual en cada nómina.",
  percentage: "Porcentaje del salario base. Ej: 10.67 = 10.67%.",
  formula: "Usa un código de fórmula del sistema (elija el código abajo).",
  manual: "El monto se ingresa manualmente al procesar la nómina.",
};

const FORMULA_CODE_OPTIONS = [
  { value: "he", label: "Horas extra" },
  { value: "vac", label: "Vacaciones" },
  { value: "hol", label: "Aguinaldo" },
  { value: "irs", label: "Renta / ISR" },
  { value: "sub", label: "Incapacidad (pago)" },
  { value: "inc", label: "Incapacidad (deducción)" },
];

// Tipo forzado por cada código de fórmula — no editable
const FORMULA_TYPE_MAP: Record<string, "earning" | "deduction"> = {
  he: "earning",
  vac: "earning",
  hol: "earning",
  sub: "earning",
  irs: "deduction",
  inc: "deduction",
};

// Qué significa el parámetro y de dónde viene el dato de entrada
const FORMULA_VALUE_HINT: Record<string, string> = {
  he: "Factor multiplicador (ej. 1.5 = 50% adicional). Las horas extra se leen automáticamente de los marcadores de asistencia (clocking) del periodo.",
  vac: "Divisor sobre ingresos de 50 semanas (ej. 25). El historial salarial proviene de las planillas procesadas anteriores del empleado.",
  hol: "Divisor del salario anual (ej. 12 = 1 mes). El acumulado anual se calcula de las planillas del año procesadas en el sistema.",
  irs: "Sin parámetro — ISR se aplica por tramos progresivos según ley CR (base imponible = salario + ingresos gravables del periodo).",
  sub: "Sin parámetro — el pago se calcula con los días e porcentaje del registro de incapacidad del empleado.",
  inc: "Sin parámetro — la deducción se calcula con los días del registro de incapacidad del empleado.",
};

const FORMULA_WITHOUT_VALUE = new Set(["irs", "sub", "inc"]);

export function ConceptUpsertModal({
  isOpen,
  tenantId,
  concept,
  onClose,
  onCreate,
  onUpdate,
}: ConceptUpsertModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"earning" | "deduction">("earning");
  const [calcMethod, setCalcMethod] = useState<CalcMethod>("fixed");
  const [isTaxable, setIsTaxable] = useState(true);
  const [baseValue, setBaseValue] = useState("0");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setType("earning");
      setCalcMethod("fixed");
      setIsTaxable(true);
      setBaseValue("0");
      setCode("");
      setError("");
      setIsSubmitting(false);
      return;
    }

    if (!concept) return;

    const method = concept.calculation_method;
    setName(concept.name);
    setCalcMethod(method);
    setCode(concept.code ?? "");
    // Tipo: si es fórmula con código conocido, forzar tipo; si no, usar el guardado
    const forcedType =
      method === "formula" && concept.code
        ? FORMULA_TYPE_MAP[concept.code]
        : undefined;
    setType(forcedType ?? concept.type);
    setIsTaxable(concept.is_taxable);
    setBaseValue(
      method === "percentage"
        ? String(Number(concept.base_value) * 100)
        : String(concept.base_value),
    );
  }, [concept, isOpen]);

  // Cuando se selecciona un código de fórmula, auto-asignar el tipo
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    const forcedType = FORMULA_TYPE_MAP[newCode];
    if (forcedType) setType(forcedType);
  };

  const handleMethodChange = (next: CalcMethod) => {
    setCalcMethod(next);
    if (next === "formula") {
      const isKnown = FORMULA_CODE_OPTIONS.some((o) => o.value === code);
      if (!isKnown) setCode("");
    }
  };

  // Tipo bloqueado cuando la fórmula lo determina unívocamente
  const typeIsLocked =
    calcMethod === "formula" && !!code && !!FORMULA_TYPE_MAP[code];

  const valueDisabled = useMemo(() => {
    if (calcMethod === "manual") return true;
    if (calcMethod === "formula") return FORMULA_WITHOUT_VALUE.has(code);
    return false;
  }, [calcMethod, code]);

  const valueLabel = useMemo(() => {
    switch (calcMethod) {
      case "fixed":
        return "Monto (₡)";
      case "percentage":
        return "Porcentaje (%)";
      case "formula":
        return "Factor / Parámetro";
      default:
        return "Valor base";
    }
  }, [calcMethod]);

  const valueHint = useMemo(() => {
    if (calcMethod === "manual") return "No aplica para método manual.";
    if (calcMethod === "percentage") {
      const pct = Number(baseValue);
      return Number.isFinite(pct)
        ? `${pct.toFixed(2)}% del salario base`
        : "Ingrese un porcentaje (ej. 10.67).";
    }
    if (calcMethod === "formula") {
      return code
        ? FORMULA_VALUE_HINT[code]
        : "Seleccione un código de fórmula.";
    }
    return undefined;
  }, [calcMethod, baseValue, code]);

  const handleSubmit = async () => {
    setError("");

    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (calcMethod === "formula" && !code) {
      setError("Seleccione un código de fórmula");
      return;
    }

    const effectiveValue = valueDisabled ? 0 : Number(baseValue);

    if (!valueDisabled && !Number.isFinite(effectiveValue)) {
      setError("El valor base debe ser numérico");
      return;
    }

    if (
      calcMethod === "percentage" &&
      (effectiveValue < 0 || effectiveValue > 100)
    ) {
      setError("El porcentaje debe estar entre 0 y 100 (ej. 10.67 para CCSS)");
      return;
    }

    setIsSubmitting(true);

    const storedValue =
      calcMethod === "percentage" ? effectiveValue / 100 : effectiveValue;

    const payload = {
      tenantId,
      name: name.trim(),
      type,
      calcMethod,
      isTaxable,
      baseValue: storedValue,
      code: code.trim() || undefined,
    };

    try {
      if (concept) {
        await onUpdate(concept.concept_id, payload);
      } else {
        await onCreate(payload);
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
      title={concept ? "Editar concepto" : "Nuevo concepto"}
      size="md"
    >
      <div className="space-y-4">
        {/* Fila 1: Nombre + Método de cálculo */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            hint="Nombre visible del concepto (ej. CCSS Empleado)."
            required
          />
          <Select
            label="Método de cálculo"
            value={calcMethod}
            onChange={(event) =>
              handleMethodChange(event.target.value as CalcMethod)
            }
            options={METHOD_OPTIONS}
            hint={METHOD_HINTS[calcMethod]}
          />
        </div>

        {/* Fila 2: Código (libre o de fórmula) + Tipo */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {calcMethod === "formula" ? (
            <Select
              label="Código de fórmula"
              value={code}
              onChange={(event) => handleCodeChange(event.target.value)}
              options={FORMULA_CODE_OPTIONS}
              placeholder="Seleccione una fórmula"
              hint="Define qué cálculo del sistema se ejecuta."
              required
            />
          ) : (
            <Input
              label="Código"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              hint="Identificador corto (ej. CCSS-EMP, BON, COM)."
            />
          )}

          <div>
            <Select
              label="Tipo"
              value={type}
              onChange={(event) =>
                setType(event.target.value as "earning" | "deduction")
              }
              options={TYPE_OPTIONS}
              hint={
                typeIsLocked
                  ? `Determinado por la fórmula "${code}".`
                  : type === "earning"
                    ? "Suma al pago del empleado."
                    : "Se descuenta del pago del empleado."
              }
              disabled={typeIsLocked}
            />
          </div>
        </div>

        {/* Fila 3: Aplica impuesto + Valor base */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Aplica impuesto (gravable)"
            value={isTaxable ? "yes" : "no"}
            onChange={(event) => setIsTaxable(event.target.value === "yes")}
            options={[
              { value: "yes", label: "Sí, suma a la base imponible" },
              { value: "no", label: "No, exento de renta" },
            ]}
            hint="Define si el monto entra a la base del Impuesto sobre la Renta."
          />
          <Input
            label={valueLabel}
            type="number"
            step="0.0001"
            value={valueDisabled ? "" : baseValue}
            disabled={valueDisabled}
            hint={valueHint}
            onChange={(event) => setBaseValue(event.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSubmitting}>
            {concept ? "Guardar concepto" : "Crear concepto"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
