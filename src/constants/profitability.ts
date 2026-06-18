import type { ProfitabilityInterval } from "@/interfaces/entities/Profitability.interface";

export const DEFAULT_PROFITABILITY_INTERVAL: ProfitabilityInterval = "24h";

// Presets del select de intervalo (R1). Cada uno define su rango; el paso del
// bucket lo resuelve el backend.
export const PROFITABILITY_INTERVAL_OPTIONS: {
  value: ProfitabilityInterval;
  label: string;
}[] = [
  { value: "24h", label: "Ultimas 24 horas" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "15d", label: "Ultimos 15 dias" },
  { value: "30d", label: "Ultimos 30 dias (1 mes)" },
  { value: "90d", label: "Ultimos 90 dias (3 meses)" },
  { value: "180d", label: "Ultimos 180 dias (6 meses)" },
  { value: "365d", label: "Ultimos 365 dias (1 ano)" },
];
