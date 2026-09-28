import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";

import type { Segment } from "@/interfaces/entities/Segment.interface";
import type { Margin } from "@/interfaces/entities/Margin.interface";
import { capitalize } from "@/utils/capitalize";

import { SegmentMarginConfigModal } from "./SegmentMarginConfigModal";
import { MARGIN_TYPES } from "./margin.schema";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

export function SegmentsTab({
  tenantId,
  segments,
  margins: initialMargins,
}: {
  tenantId: string;
  segments: Segment[];
  margins: Margin[];
}) {
  const [margins, setMargins] = useState<Margin[]>(initialMargins);
  const [configSegment, setConfigSegment] = useState<Segment | null>(null);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  useEffect(() => {
    setMargins(initialMargins);
  }, [initialMargins]);

  return (
    <div className="space-y-8">
      {/* Description */}
      <div className="p-4 bg-blue-100 border border-blue-300 rounded-xl text-sm text-blue-800">
        <p className="font-semibold mb-1">¿Qué son los segmentos y márgenes?</p>
        <p>
          Los <strong>segmentos</strong> permiten clasificar clientes (ej:
          Mayorista, Minorista, VIP). Los <strong>márgenes</strong> definen los
          criterios de clasificación. Un cliente pasa a un segmento si cumple{" "}
          <strong>al menos uno</strong> de sus márgenes configurados. Haga clic
          en un segmento para configurar sus márgenes.
        </p>
      </div>

      {/* Segments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            Segmentos de Cliente
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {segments.map((seg) => {
            const segMargins = margins.filter(
              (m) => m.segment_name === seg.segment_name,
            );
            return (
              <button
                key={seg.segment_id}
                type="button"
                onClick={() => setConfigSegment(seg)}
                className="text-left border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {capitalize(seg.segment_name)}
                    </p>
                    {seg.hierarchy && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Nivel: {seg.hierarchy}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {segMargins.length}{" "}
                    {segMargins.length === 1 ? "criterio" : "criterios"}
                  </Badge>
                </div>

                {segMargins.length > 0 ? (
                  <ul className="space-y-1">
                    {segMargins.map((m) => {
                      const type = MARGIN_TYPES.find(
                        (t) => t.name === m.type_name,
                      );
                      return (
                        <li
                          key={m.customer_segment_margin_id}
                          className="text-xs text-gray-600 flex items-center gap-1"
                        >
                          <span className="text-gray-400">•</span>
                          {type?.label ?? m.type_name}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Sin criterios configurados
                  </p>
                )}

                <p className="text-xs text-blue-600 mt-3 font-medium">
                  Configurar →
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {configSegment && (
        <SegmentMarginConfigModal
          segment={configSegment}
          tenantId={tenantId}
          margins={margins.filter(
            (m) => m.segment_name === configSegment.segment_name,
          )}
          onClose={() => setConfigSegment(null)}
          onRefresh={(updatedMargins) => setMargins(updatedMargins)}
          onError={(msg) => setToast({ mode: "error", message: msg })}
        />
      )}

      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
