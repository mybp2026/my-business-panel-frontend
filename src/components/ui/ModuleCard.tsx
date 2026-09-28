import { IconChevronRight } from "@/assets/icons/IconChevronRight";
import type { ModuleCardProps } from "@/interfaces/components/ui/ModuleCardProps.interface";
import { Link } from "react-router-dom";

export function ModuleCard({
  label,
  description,
  icon,
  to,
  code,
  colorClass = "",
  accentColor,
}: ModuleCardProps) {
  const colorHoverMap = {
    blue: "hover:bg-blue-50 hover:border-blue-200",
    purple: "hover:bg-purple-50 hover:border-purple-200",
    amber: "hover:bg-amber-50 hover:border-amber-200",
    green: "hover:bg-green-50 hover:border-green-200",
    red: "hover:bg-red-50 hover:border-red-200",
    gray: "hover:bg-gray-100 hover:border-gray-300",
  };

  const colorIconMap = {
    blue: "group-hover:bg-blue-100 group-hover:text-blue-700",
    purple: "group-hover:bg-purple-100 group-hover:text-purple-700",
    amber: "group-hover:bg-amber-100 group-hover:text-amber-700",
    green: "group-hover:bg-green-100 group-hover:text-green-700",
    red: "group-hover:bg-red-100 group-hover:text-red-700",
    gray: "group-hover:bg-gray-200 group-hover:text-gray-900",
  };

  const hoverClass = accentColor
    ? colorHoverMap[accentColor]
    : "hover:bg-gray-50 hover:border-gray-200";
  const iconHoverClass = accentColor
    ? colorIconMap[accentColor]
    : "group-hover:bg-gray-200";

  return (
    <Link
      to={to}
      className={`group bg-white rounded-2xl border border-gray-300 p-5 flex flex-col items-start gap-3 hover:shadow-md transition-all duration-200 relative overflow-hidden ${hoverClass} ${colorClass}`}
    >
      <div className="absolute top-3 right-3 text-xs font-bold opacity-10 text-gray-700 text-right">
        {code}
      </div>

      <div
        className={`w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-700 transition-colors ${iconHoverClass}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="font-semibold text-gray-900 text-sm font-display">
          {label}
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-2 text-gray-300 group-hover:text-gray-600 transition-colors">
        <span className="text-xs font-medium text-gray-500">Acceder</span>
        <IconChevronRight />
      </div>
    </Link>
  );
}
