import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

import type { InventoryItem } from "@/interfaces/entities/InventoryItem.interface";

interface EditInventoryModalProps {
  isOpen: boolean;
  item: InventoryItem;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    stock: number;
    expiration_date: string | null;
  }) => Promise<void>;
}

export function EditInventoryModal({
  isOpen,
  item,
  isSubmitting,
  onClose,
  onSubmit,
}: EditInventoryModalProps) {
  const [stock, setStock] = useState(String(item.stock));
  const [expiration, setExpiration] = useState(
    item.expiration_date
      ? new Date(item.expiration_date).toISOString().slice(0, 10)
      : "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStock(String(item.stock));
      setExpiration(
        item.expiration_date
          ? new Date(item.expiration_date).toISOString().slice(0, 10)
          : "",
      );
      setError(null);
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const stockNum = Number(stock);
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setError("El stock debe ser un número mayor o igual a 0");
      return;
    }
    await onSubmit({
      stock: stockNum,
      expiration_date: expiration || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar registro de inventario"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700">
          <p className="font-medium text-gray-900 mb-1">
            {item.variant_name}
            {item.sku ? (
              <span className="ml-2 font-normal text-gray-500">
                SKU {item.sku}
              </span>
            ) : null}
          </p>
          <p className="font-mono text-gray-500">
            ID {item.inventory_id.slice(0, 8)}
          </p>
        </div>

        <Input
          label="Stock"
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          required
        />

        <Input
          label="Fecha de vencimiento"
          type="date"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
        />

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
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
