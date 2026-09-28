import type { ReactNode } from "react";

import { MODULES } from "@/config/modules";
import { useModule } from "@/context/ModuleContext";

interface PageHeaderBannerProps {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

const BANNER_STYLES = {
  blue: {
    section:
      "border-blue-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_36%),linear-gradient(135deg,rgba(239,246,255,1),rgba(255,255,255,1)_58%,rgba(238,242,255,1))] shadow-[0_18px_40px_-24px_rgba(37,99,235,0.24)]",
    eyebrow: "text-blue-700",
  },
  amber: {
    section:
      "border-amber-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_36%),linear-gradient(135deg,rgba(255,251,235,1),rgba(255,255,255,1)_58%,rgba(255,247,237,1))] shadow-[0_18px_40px_-24px_rgba(146,64,14,0.32)]",
    eyebrow: "text-amber-700",
  },
  purple: {
    section:
      "border-purple-200 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_36%),linear-gradient(135deg,rgba(250,245,255,1),rgba(255,255,255,1)_58%,rgba(253,244,255,1))] shadow-[0_18px_40px_-24px_rgba(126,34,206,0.28)]",
    eyebrow: "text-purple-700",
  },
  green: {
    section:
      "border-green-200 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_36%),linear-gradient(135deg,rgba(240,253,244,1),rgba(255,255,255,1)_58%,rgba(236,253,245,1))] shadow-[0_18px_40px_-24px_rgba(21,128,61,0.28)]",
    eyebrow: "text-green-700",
  },
  red: {
    section:
      "border-red-200 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_36%),linear-gradient(135deg,rgba(254,242,242,1),rgba(255,255,255,1)_58%,rgba(255,241,242,1))] shadow-[0_18px_40px_-24px_rgba(185,28,28,0.28)]",
    eyebrow: "text-red-700",
  },
  gray: {
    section:
      "border-gray-300 bg-[radial-gradient(circle_at_top_left,rgba(17,24,39,0.08),transparent_36%),linear-gradient(135deg,rgba(249,250,251,1),rgba(255,255,255,1)_58%,rgba(243,244,246,1))] shadow-[0_18px_40px_-24px_rgba(17,24,39,0.22)]",
    eyebrow: "text-gray-800",
  },
} as const;

export function PageHeaderBanner({
  eyebrow,
  title,
  description,
  children,
}: PageHeaderBannerProps) {
  const { currentModuleId } = useModule();
  const styles = BANNER_STYLES[MODULES[currentModuleId].color];

  return (
    <section className={`mb-6 rounded-4xl border p-6 ${styles.section}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-6xl">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.22em] ${styles.eyebrow}`}
          >
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
