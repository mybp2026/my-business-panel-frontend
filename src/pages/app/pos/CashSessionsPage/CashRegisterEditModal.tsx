import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cashRegisterApi } from "@/api/cashRegister.api";
import type { CashRegister } from "@/interfaces/entities/CashRegister.interface";
import type { Branch } from "@/interfaces/entities/Branch.interface";

const generateKey = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export function CashRegisterEditModal({
  register,
  branches,
  onClose,
  onSaved,
}: {
  register: CashRegister;
  branches: Branch[];
  onClose: () => void;
  onSaved: (updated: CashRegister) => void;
}) {
  const [name, setName] = useState(register.register_name);
  const [branchId, setBranchId] = useState(register.branch_id);
  const [isActive, setIsActive] = useState(register.is_active);
  const [registerKey, setRegisterKey] = useState(register.cash_register_key ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await cashRegisterApi.update(register.cash_register_id, {
        register_name: name.trim(),
        is_active: isActive,
        cash_register_key: registerKey.trim() || null,
      });
      onSaved(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const branchOptions = branches.map((b) => ({
    value: b.branch_id,
    label: b.branch_name,
  }));

  return (
    <Modal isOpen onClose={onClose} title="Editar Caja Registradora" size="sm">
      <div className="space-y-4">
        <Input
          label="Nombre de caja"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Select
          label="Sucursal"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          options={branchOptions}
        />
        <Select
          label="Estado"
          value={isActive ? "true" : "false"}
          onChange={(e) => setIsActive(e.target.value === "true")}
          options={[
            { value: "true", label: "Activa" },
            { value: "false", label: "Inactiva" },
          ]}
        />
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Clave de acceso"
                value={registerKey}
                onChange={(e) => setRegisterKey(e.target.value)}
                hint="Requerida por cajeros no-admin para abrir/cerrar sesión. Vacío = sin clave."
                placeholder="Ej: AB12CD"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRegisterKey(generateKey())}
              disabled={loading}
            >
              Generar
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" fullWidth onClick={handleSubmit} loading={loading}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
