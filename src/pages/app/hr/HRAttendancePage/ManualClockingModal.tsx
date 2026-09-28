import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface ManualClockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    employeeId: string;
    clockIn: string;
    clockOut?: string;
  }) => Promise<void>;
  employees: { value: string; label: string }[];
}

export function ManualClockingModal({
  isOpen,
  onClose,
  onSubmit,
  employees,
}: ManualClockingModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !clockIn) return;

    setIsLoading(true);
    try {
      await onSubmit({
        employeeId,
        clockIn,
        clockOut: clockOut || undefined,
      });
      setEmployeeId("");
      setClockIn("");
      setClockOut("");
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registro Manual de Asistencia"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Empleado"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={employees}
          required
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Fecha y hora de entrada"
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            required
          />
          <Input
            label="Fecha y hora de salida (Opcional)"
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={!employeeId || !clockIn}
          >
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
