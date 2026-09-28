import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { marginApi } from "@/api/margin.api";
import type { Margin } from "@/interfaces/entities/Margin.interface";
import type { Segment } from "@/interfaces/entities/Segment.interface";
import type { CreateMarginRequest } from "@/interfaces/api/requests/CreateMarginRequest.interface";
import { MARGIN_TYPES, THRESHOLD_FIELD_CONFIG } from "./margin.schema";
import { capitalize } from "@/utils/capitalize";

interface SegmentMarginConfigModalProps {
  segment: Segment;
  tenantId: string;
  margins: Margin[];
  onClose: () => void;
  onRefresh: (updatedMargins: Margin[]) => void;
  onError: (msg: string) => void;
}

interface EditingState {
  typeId: number;
  value: string;
}

export function SegmentMarginConfigModal({
  segment,
  tenantId,
  margins,
  onClose,
  onRefresh,
  onError,
}: SegmentMarginConfigModalProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

  const getMarginForType = (typeName: string) =>
    margins.find(
      (m) =>
        m.segment_name === segment.segment_name && m.type_name === typeName,
    );

  const getThresholdValue = (margin: Margin, typeId: number): string => {
    const config = THRESHOLD_FIELD_CONFIG[typeId];
    if (!config) return "—";
    const raw = margin[config.field as keyof Margin];
    return raw != null ? String(raw) : "—";
  };

  const getThresholdDisplay = (margin: Margin, typeId: number): string => {
    const config = THRESHOLD_FIELD_CONFIG[typeId];
    if (!config) return "—";
    const raw = margin[config.field as keyof Margin];
    if (raw == null) return "—";
    if (typeId === 1 || typeId === 4) {
      return `Bs. ${Number(raw).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
    }
    if (typeId === 2) return `${raw} mes${Number(raw) !== 1 ? "es" : ""}`;
    if (typeId === 3) return `${raw} compra${Number(raw) !== 1 ? "s" : ""}/mes`;
    return String(raw);
  };

  const handleSave = async () => {
    if (!editing) return;
    const typeInfo = MARGIN_TYPES.find((t) => t.id === editing.typeId);
    if (!typeInfo) return;

    const config = THRESHOLD_FIELD_CONFIG[editing.typeId];
    const numVal = Number(editing.value);
    if (!Number.isFinite(numVal) || numVal <= 0) {
      onError("El valor debe ser un número mayor a 0.");
      return;
    }

    const existingMargin = getMarginForType(typeInfo.name);
    setSaving(true);
    try {
      if (existingMargin) {
        const updatePayload = {
          spending_threshold:
            config.field === "spending_threshold" ? numVal : undefined,
          seniority_months:
            config.field === "seniority_months" ? numVal : undefined,
          frequency_per_month:
            config.field === "frequency_per_month" ? numVal : undefined,
        };
        await marginApi.update(
          existingMargin.customer_segment_margin_id,
          updatePayload,
        );
      } else {
        const createPayload: CreateMarginRequest = {
          tenant_id: tenantId,
          customer_segment_id: Number(segment.segment_id),
          customer_segment_margin_type: editing.typeId,
          spending_threshold:
            config.field === "spending_threshold" ? numVal : 0,
          seniority_months: config.field === "seniority_months" ? numVal : 0,
          frequency_per_month:
            config.field === "frequency_per_month" ? numVal : 0,
        };
        await marginApi.create(createPayload);
      }

      const refreshed = await marginApi.listByTenant(tenantId);
      onRefresh(refreshed);
      setEditing(null);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Error al guardar el margen",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (margin: Margin) => {
    if (!confirm("¿Eliminar este margen?")) return;
    setSaving(true);
    try {
      await marginApi.delete(margin.customer_segment_margin_id);
      const refreshed = await marginApi.listByTenant(tenantId);
      onRefresh(refreshed);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Error al eliminar el margen",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Configurar: ${capitalize(segment.segment_name)}`}
      size="md"
    >
      <div className="space-y-1 mb-4">
        <p className="text-xs text-gray-500">
          Un cliente pasa a este segmento si cumple{" "}
          <strong>al menos uno</strong> de los márgenes configurados aquí.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {MARGIN_TYPES.map((marginType) => {
          const existing = getMarginForType(marginType.name);
          const config = THRESHOLD_FIELD_CONFIG[marginType.id];
          const isEditingThis = editing?.typeId === marginType.id;

          return (
            <div key={marginType.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {marginType.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {config.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {existing && !isEditingThis && (
                    <span className="text-sm font-semibold text-gray-900">
                      {getThresholdDisplay(existing, marginType.id)}
                    </span>
                  )}

                  {!isEditingThis && (
                    <>
                      <button
                        type="button"
                        className="px-2 cursor-pointer py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        onClick={() =>
                          setEditing({
                            typeId: marginType.id,
                            value: existing
                              ? getThresholdValue(existing, marginType.id)
                              : "",
                          })
                        }
                        disabled={saving}
                      >
                        {existing ? "Editar" : "Agregar"}
                      </button>
                      {existing && (
                        <button
                          type="button"
                          className="px-2 cursor-pointer py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleDelete(existing)}
                          disabled={saving}
                        >
                          Quitar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isEditingThis && (
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label={config.label}
                      type="number"
                      min="0"
                      step={config.isInteger ? "1" : "0.01"}
                      value={editing.value}
                      onChange={(e) =>
                        setEditing({ ...editing, value: e.target.value })
                      }
                      autoFocus
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Guardando…" : "Guardar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(null)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <Button variant="ghost" fullWidth onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
