import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

import type {
  HrSuspention,
  UpdateHrSuspentionPayload,
} from "@/interfaces/entities/Hr.interface";

interface SuspentionEditorModalProps {
  isOpen: boolean;
  suspention: HrSuspention | null;
  onClose: () => void;
  onSubmit: (payload: UpdateHrSuspentionPayload) => Promise<void>;
}

export function SuspentionEditorModal({
  isOpen,
  suspention,
  onClose,
  onSubmit,
}: SuspentionEditorModalProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStart("");
      setEnd("");
      setReason("");
      setError("");
      setIsSubmitting(false);
      return;
    }

    setStart(suspention?.suspention_start?.slice(0, 10) ?? "");
    setEnd(suspention?.suspention_end?.slice(0, 10) ?? "");
    setReason(suspention?.reason ?? "");
  }, [isOpen, suspention]);

  const handleSubmit = async () => {
    setError("");

    if (!start || !end || !reason.trim()) {
      setError("Complete inicio, fin y motivo");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        suspentionStart: start,
        suspentionEnd: end,
        reason: reason.trim(),
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo actualizar la suspensión",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar suspensión"
      size="sm"
    >
      <div className="space-y-4">
        <Input
          label="Inicio"
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          required
        />
        <Input
          label="Fin"
          type="date"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          required
        />
        <Input
          label="Motivo"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSubmitting}>
            Guardar suspensión
          </Button>
        </div>
      </div>
    </Modal>
  );
}
