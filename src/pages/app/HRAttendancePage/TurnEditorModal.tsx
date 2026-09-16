import { useEffect, useState } from "react";

import { journeyApi } from "@/api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

import type {
  HrJourneyClassification,
  HrTurn,
} from "@/interfaces/entities/Hr.interface";

const JOURNEY_LABEL: Record<HrJourneyClassification["effectiveJourney"], string> = {
  diurna: "Diurna",
  nocturna: "Nocturna",
  mixta: "Mixta",
};

interface TurnEditorModalProps {
  isOpen: boolean;
  turn: HrTurn | null;
  branchName?: string;
  onClose: () => void;
  onSubmit: (payload: { entry: string; out: string }) => Promise<void>;
}

export function TurnEditorModal({
  isOpen,
  turn,
  branchName,
  onClose,
  onSubmit,
}: TurnEditorModalProps) {
  const [entry, setEntry] = useState("");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classification, setClassification] =
    useState<HrJourneyClassification | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEntry("");
      setOut("");
      setError("");
      setIsSubmitting(false);
      setClassification(null);
      return;
    }

    setEntry(turn?.entry?.slice(0, 5) ?? "");
    setOut(turn?.out?.slice(0, 5) ?? "");
  }, [isOpen, turn]);

  useEffect(() => {
    if (!isOpen || !entry || !out) {
      setClassification(null);
      return;
    }

    let cancelled = false;
    setIsClassifying(true);

    const timeout = setTimeout(() => {
      journeyApi
        .classify(entry, out)
        .then((result) => {
          if (!cancelled) setClassification(result);
        })
        .catch(() => {
          if (!cancelled) setClassification(null);
        })
        .finally(() => {
          if (!cancelled) setIsClassifying(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isOpen, entry, out]);

  const handleSubmit = async () => {
    setError("");

    if (!entry || !out) {
      setError("Debe completar hora de entrada y salida");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({ entry, out });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={turn ? "Editar turno" : "Nuevo turno"}
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          {branchName ? `Sucursal: ${branchName}` : "Seleccione una sucursal"}
        </div>

        <Input
          label="Hora de entrada"
          type="time"
          value={entry}
          onChange={(event) => setEntry(event.target.value)}
          required
        />
        <Input
          label="Hora de salida"
          type="time"
          value={out}
          onChange={(event) => setOut(event.target.value)}
          required
        />

        {entry && out && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            {isClassifying && !classification && (
              <span className="text-gray-500">Calculando jornada...</span>
            )}
            {classification && (
              <p className="text-gray-700">
                Jornada{" "}
                <span className="font-semibold text-gray-900">
                  {JOURNEY_LABEL[classification.effectiveJourney]}
                </span>{" "}
                · {classification.totalHours.toFixed(2)} horas (maximo{" "}
                {classification.maxDaily}h, Art. 173 LOTTT)
                {classification.reason ? ` · ${classification.reason}` : ""}
              </p>
            )}
          </div>
        )}

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
            {turn ? "Guardar turno" : "Crear turno"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
