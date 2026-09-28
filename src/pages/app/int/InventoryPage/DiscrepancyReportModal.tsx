import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

import type { AggregatedInventoryItem } from "@/interfaces/entities/InventoryItem.interface";

export interface DiscrepancyFormState {
  product_variant_id: string;
  physical_quantity: string;
  discrepancy_reason: string;
}

interface DiscrepancyReportModalProps {
  isOpen: boolean;
  inventory: AggregatedInventoryItem[];
  warehouseName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    inventory_id: string;
    product_variant_id: string;
    stored_quantity: number;
    physical_quantity: number;
    discrepancy_reason?: string;
  }) => Promise<void>;
}

export function DiscrepancyReportModal({
  isOpen,
  inventory,
  warehouseName,
  isSubmitting,
  onClose,
  onSubmit,
}: DiscrepancyReportModalProps) {
  const [formData, setFormData] = useState<DiscrepancyFormState>({
    product_variant_id: "",
    physical_quantity: "",
    discrepancy_reason: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        product_variant_id: "",
        physical_quantity: "",
        discrepancy_reason: "",
      });
      setError(null);
    }
  }, [isOpen]);

  const selectedItem = inventory.find(
    (i) => i.product_variant_id === formData.product_variant_id,
  );

  const physical = Number(formData.physical_quantity);
  const stored = selectedItem?.stock ?? 0;
  const delta = Number.isFinite(physical) ? physical - stored : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItem) {
      setError("Selecciona un producto del inventario");
      return;
    }
    if (!Number.isFinite(physical) || physical < 0) {
      setError("La cantidad física debe ser un número mayor o igual a 0");
      return;
    }
    if (physical === stored) {
      setError("No hay diferencia con el stock del sistema");
      return;
    }

    await onSubmit({
      inventory_id: selectedItem.product_variant_id,
      product_variant_id: selectedItem.product_variant_id,
      stored_quantity: stored,
      physical_quantity: physical,
      discrepancy_reason: formData.discrepancy_reason.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reporte de discrepancia — ${warehouseName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Producto en inventario"
          value={formData.product_variant_id}
          onChange={(e) =>
            setFormData((p) => ({ ...p, product_variant_id: e.target.value }))
          }
          options={inventory.map((i) => ({
            value: i.product_variant_id,
            label: `${i.product_name} — ${i.variant_name}${i.sku ? ` (${i.sku})` : ""}`,
          }))}
          placeholder="Seleccionar producto"
          required
        />

        {selectedItem && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 grid grid-cols-3 gap-3">
            <div>
              <p className="uppercase tracking-wide text-gray-500">SKU</p>
              <p className="font-mono">{selectedItem.sku ?? "—"}</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-gray-500">
                Stock sistema
              </p>
              <p className="font-mono text-base text-gray-900">{stored}</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-gray-500">Vence</p>
              <p>
                {selectedItem.expiration_date
                  ? new Date(selectedItem.expiration_date).toLocaleDateString(
                      "es-CR",
                    )
                  : "—"}
              </p>
            </div>
          </div>
        )}

        <Input
          label="Conteo físico"
          type="number"
          min={0}
          value={formData.physical_quantity}
          onChange={(e) =>
            setFormData((p) => ({ ...p, physical_quantity: e.target.value }))
          }
          required
        />

        {selectedItem && formData.physical_quantity !== "" && (
          <div
            className={[
              "p-3 rounded-lg text-xs border",
              delta === 0
                ? "bg-gray-50 border-gray-200 text-gray-700"
                : delta > 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800",
            ].join(" ")}
          >
            Delta (físico - sistema): <strong>{delta}</strong>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700">
            Motivo / observaciones
            <span className="ml-1 text-xs font-normal text-gray-400">
              (opcional)
            </span>
          </label>
          <textarea
            rows={3}
            value={formData.discrepancy_reason}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                discrepancy_reason: e.target.value,
              }))
            }
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent-500"
            placeholder="Detalles del conteo manual..."
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isSubmitting}
          >
            Registrar discrepancia
          </Button>
        </div>
      </form>
    </Modal>
  );
}
