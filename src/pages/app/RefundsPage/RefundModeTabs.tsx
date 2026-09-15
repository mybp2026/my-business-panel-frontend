import type { RefundMode } from "@/hooks/useRefundFlow";

interface RefundModeTabsProps {
  mode: RefundMode;
  onChange: (mode: RefundMode) => void;
}

const HINTS: Record<RefundMode, string> = {
  partial:
    "Selecciona uno o más productos de la factura para reembolsar. La factura se actualiza automáticamente.",
  full: "Elimina el registro de factura asociado a la venta.",
};

export function RefundModeTabs({ mode, onChange }: RefundModeTabsProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-300 p-4 mb-6">
      <div className="flex gap-2">
        <TabButton
          active={mode === "partial"}
          onClick={() => onChange("partial")}
          label="Reembolso parcial"
        />
        <TabButton
          active={mode === "full"}
          onClick={() => onChange("full")}
          label="Reembolso completo"
        />
      </div>
      <p className="mt-3 text-xs text-gray-500">{HINTS[mode]}</p>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "cursor-pointer flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors",
        active
          ? "bg-accent-600 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
