import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { AggregatedInventoryItem } from "@/interfaces/entities/InventoryItem.interface";

interface DisaggregateModalProps {
  isOpen: boolean;
  item: AggregatedInventoryItem | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => Promise<void>;
}

export function DisaggregateModal({ isOpen, item, isSubmitting, onClose, onSubmit }: DisaggregateModalProps) {
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Desagrupar Lote">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          ¿Cuántas unidades de <strong>{item.variant_name}</strong> deseas desagrupar en sus componentes individuales?
        </p>
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          Stock actual: {item.stock}
        </p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad a desagrupar
          </label>
          <Input
            type="number"
            min={1}
            max={item.stock}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSubmit(quantity)}
            disabled={isSubmitting || quantity < 1 || quantity > item.stock}
          >
            {isSubmitting ? "Procesando..." : "Desagrupar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

