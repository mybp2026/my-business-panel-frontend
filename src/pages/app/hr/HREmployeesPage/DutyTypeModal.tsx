import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/assets/icons";

import type { HrDutiesType } from "@/interfaces/entities/Hr.interface";

interface DutyTypeModalProps {
  isOpen: boolean;
  dutiesTypes: HrDutiesType[];
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function DutyTypeModal({
  isOpen,
  dutiesTypes,
  onClose,
  onCreate,
  onDelete,
}: DutyTypeModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name.trim(), description.trim());
      setName("");
      setDescription("");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tipos de cargo" size="sm">
      <div className="grid grid-cols-1 gap-3 mb-4">
        <Input
          label="Nombre del cargo"
          placeholder="Ej: Vendedor, Conserje"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Descripción"
          placeholder="Responsabilidades del cargo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button
          type="button"
          loading={isCreating}
          disabled={!name.trim()}
          onClick={handleCreate}
        >
          <IconPlus />
          Agregar cargo
        </Button>
      </div>

      {dutiesTypes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {dutiesTypes.map((dt) => (
            <div
              key={dt.duties_type_id}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
            >
              <span>{dt.name}</span>
              <button
                type="button"
                className="ml-1 text-gray-400 hover:text-red-500"
                onClick={() => onDelete(dt.duties_type_id)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          Sin tipos de cargo configurados. Agrega al menos uno antes de
          registrar empleados.
        </p>
      )}
    </Modal>
  );
}
