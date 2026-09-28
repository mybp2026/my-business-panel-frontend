import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

import type { Segment } from "@/interfaces/entities/Segment.interface";
import type { Margin } from "@/interfaces/entities/Margin.interface";

import {
  MARGIN_TYPES,
  THRESHOLD_FIELD_CONFIG,
  marginSchema,
  type MarginFormData,
} from "./margin.schema";
import { createMargin, updateMargin } from "@/router/actions/margin.actions";
import { defaultCustomerSegments } from "@/constants/default-customer-segments";

type MarginUpsertMode = "create" | "edit";

interface MarginUpsertModalProps {
  isOpen: boolean;
  mode: MarginUpsertMode;
  tenantId: string;
  segments: Segment[];
  editingMargin: Margin | null;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
  onError?: (message: string) => void;
}

const INITIAL_FORM: MarginFormData = {
  customer_segment_id: "",
  customer_segment_margin_type: "",
  spending_threshold: "0",
  seniority_months: "0",
  frequency_per_month: "0",
};

const mapZodErrors = (
  issues: z.ZodError["issues"],
): Partial<Record<keyof MarginFormData, string>> =>
  issues.reduce<Partial<Record<keyof MarginFormData, string>>>((acc, issue) => {
    const field = issue.path[0] as keyof MarginFormData | undefined;
    if (field && !acc[field]) acc[field] = issue.message;
    return acc;
  }, {});

const normalizeSegmentName = (value: string): string =>
  value.trim().toLowerCase();

export function MarginUpsertModal({
  isOpen,
  mode,
  tenantId,
  segments,
  editingMargin,
  onClose,
  onSaved,
  onError,
}: MarginUpsertModalProps) {
  const [form, setForm] = useState<MarginFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof MarginFormData, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && editingMargin) {
      const segment = segments.find(
        (s) =>
          normalizeSegmentName(s.segment_name) ===
          normalizeSegmentName(editingMargin.segment_name),
      );
      const marginType = MARGIN_TYPES.find(
        (t) => t.name === editingMargin.type_name,
      );

      setForm({
        customer_segment_id: segment?.segment_id ?? "",
        customer_segment_margin_type: marginType?.id.toString() ?? "",
        spending_threshold: editingMargin.spending_threshold.toString(),
        seniority_months: editingMargin.seniority_months.toString(),
        frequency_per_month: editingMargin.frequency_per_month.toString(),
      });
    } else {
      setForm(INITIAL_FORM);
    }

    setErrors({});
  }, [editingMargin, isOpen, mode, segments]);

  const selectedTypeId = Number(form.customer_segment_margin_type);
  const thresholdConfig = THRESHOLD_FIELD_CONFIG[selectedTypeId] ?? null;

  const handleChange = (field: keyof MarginFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = marginSchema.safeParse(form);
    if (!result.success) {
      setErrors(mapZodErrors(result.error.issues));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "edit" && editingMargin) {
        const updateData: Record<string, number> = {};
        updateData.customer_segment_id = Number(form.customer_segment_id);

        if (selectedTypeId === 1 || selectedTypeId === 4) {
          updateData.spending_threshold = Number(form.spending_threshold);
        } else if (selectedTypeId === 2) {
          updateData.seniority_months = Number(form.seniority_months);
        } else if (selectedTypeId === 3) {
          updateData.frequency_per_month = Number(form.frequency_per_month);
        }

        await updateMargin(
          editingMargin.customer_segment_margin_id,
          updateData,
        );
      } else {
        const segmentId = Number(form.customer_segment_id);
        const isSegmentOptionSelected = defaultCustomerSegments.some(
          (segment) => String(segment.value) === form.customer_segment_id,
        );

        if (
          !isSegmentOptionSelected ||
          !Number.isInteger(segmentId) ||
          segmentId <= 0
        ) {
          setErrors((prev) => ({
            ...prev,
            customer_segment_id: "Selecciona un segmento valido",
          }));
          return;
        }

        await createMargin({
          tenant_id: tenantId,
          customer_segment_id: segmentId,
          customer_segment_margin_type: Number(
            form.customer_segment_margin_type,
          ),
          spending_threshold: Number(form.spending_threshold),
          seniority_months: Number(form.seniority_months),
          frequency_per_month: Number(form.frequency_per_month),
        });
      }

      const successMessage =
        mode === "edit"
          ? "Margen actualizado exitosamente"
          : "Margen creado exitosamente";
      setSubmitting(false);
      onClose();
      void onSaved(successMessage);
    } catch (error) {
      setSubmitting(false);
      onError?.(
        error instanceof Error ? error.message : "Error al guardar el margen",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Editar Margen" : "Nuevo Margen"}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Segmento"
          value={form.customer_segment_id}
          onChange={(e) => handleChange("customer_segment_id", e.target.value)}
          options={defaultCustomerSegments.map((segment) => ({
            value: segment.value.toString(),
            label: segment.label,
          }))}
          placeholder={
            defaultCustomerSegments.map((segment) => ({
              value: segment.value.toString(),
              label: segment.label,
            })).length > 0
              ? "Selecciona un segmento"
              : "No hay segmentos disponibles"
          }
          error={errors.customer_segment_id}
          disabled={
            defaultCustomerSegments.map((segment) => ({
              value: segment.value.toString(),
              label: segment.label,
            })).length === 0
          }
          required
        />

        <Select
          label="Tipo de Margen"
          value={form.customer_segment_margin_type}
          onChange={(e) =>
            handleChange("customer_segment_margin_type", e.target.value)
          }
          options={[
            ...MARGIN_TYPES.map((t) => ({
              value: t.id.toString(),
              label: t.label,
            })),
          ]}
          error={errors.customer_segment_margin_type}
          disabled={mode === "edit"}
          required
        />

        {thresholdConfig && (
          <div>
            <Input
              label={thresholdConfig.label}
              type="number"
              placeholder="0"
              step={thresholdConfig.isInteger ? "1" : "0.01"}
              min="0"
              value={form[thresholdConfig.field]}
              onChange={(e) =>
                handleChange(thresholdConfig.field, e.target.value)
              }
              error={errors[thresholdConfig.field]}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              {thresholdConfig.description}
            </p>
          </div>
        )}

        {!thresholdConfig && selectedTypeId === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Selecciona un tipo de margen para continuar
          </p>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={submitting}
          >
            {mode === "edit" ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
