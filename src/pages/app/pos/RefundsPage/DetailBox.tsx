import type { ReactNode } from "react";

interface DetailBoxProps {
  label: string;
  value: ReactNode;
  hint?: string;
  mono?: boolean;
}

export function DetailBox({ label, value, hint, mono }: DetailBoxProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p
        className={[
          "text-sm text-gray-900 mt-1 break-all",
          mono ? "font-mono text-xs" : "font-medium",
        ].join(" ")}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}