import { useState, type ReactNode } from "react";
import { IconChevronRight } from "@/assets/icons";

interface SidebarCollapsibleGroupProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

/**
 * Cascaron desplegable compartido por la lista de modulos y la lista
 * de submodulos del sidebar: mismo encabezado con chevron y misma
 * animacion de expansion, solo cambia el titulo y los items.
 */
export function SidebarCollapsibleGroup({
  title,
  children,
  defaultExpanded = true,
}: SidebarCollapsibleGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mx-3 rounded-2xl border border-gray-200 bg-gray-50/90 p-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer w-full items-center justify-between px-2 py-2 text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          {title}
        </p>
        <span
          className={[
            "text-gray-400 transition-transform duration-200",
            isExpanded ? "rotate-90" : "",
          ].join(" ")}
        >
          <IconChevronRight width={14} />
        </span>
      </button>
      <div
        className={[
          "space-y-1 overflow-hidden transition-all duration-200",
          isExpanded ? "mt-1 max-h-96 opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
