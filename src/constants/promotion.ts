import type { PromoInterval } from "@/interfaces/entities/Promotion.interface";

export const DEFAULT_PROMO_INTERVAL: PromoInterval = "30d";

export const PROMO_INTERVAL_OPTIONS: { value: PromoInterval; label: string }[] =
  [
    { value: "24h", label: "Ultimas 24 horas" },
    { value: "7d", label: "Ultimos 7 dias" },
    { value: "15d", label: "Ultimos 15 dias" },
    { value: "30d", label: "Ultimos 30 dias (1 mes)" },
    { value: "90d", label: "Ultimos 90 dias (3 meses)" },
    { value: "180d", label: "Ultimos 180 dias (6 meses)" },
    { value: "365d", label: "Ultimos 365 dias (1 ano)" },
  ];
