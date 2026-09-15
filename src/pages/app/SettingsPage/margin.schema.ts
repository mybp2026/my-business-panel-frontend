import { z } from "zod";

export const MARGIN_TYPES = [
  { id: 1, name: "spending_based", label: "Basado en Gasto" },
  { id: 2, name: "seniority_based", label: "Basado en Antigüedad" },
  { id: 3, name: "frequency_based", label: "Basado en Frecuencia" },
] as const;

export type MarginTypeName = (typeof MARGIN_TYPES)[number]["name"];

export const THRESHOLD_FIELD_CONFIG: Record<
  number,
  {
    field: "spending_threshold" | "seniority_months" | "frequency_per_month";
    label: string;
    isInteger: boolean;
    description: string;
  }
> = {
  1: {
    field: "spending_threshold",
    label: "Umbral de Gasto (Bs.)",
    isInteger: false,
    description: "Monto total acumulado para alcanzar este segmento",
  },
  2: {
    field: "seniority_months",
    label: "Meses de Antigüedad",
    isInteger: true,
    description: "Meses desde la primera compra del cliente",
  },
  3: {
    field: "frequency_per_month",
    label: "Compras por Mes",
    isInteger: true,
    description: "Número de compras por mes para alcanzar este segmento",
  },
};

export const marginSchema = z
  .object({
    customer_segment_id: z.string().min(1, "Selecciona un segmento"),
    customer_segment_margin_type: z
      .string()
      .min(1, "Selecciona un tipo de margen"),
    spending_threshold: z.string().default("0"),
    seniority_months: z.string().default("0"),
    frequency_per_month: z.string().default("0"),
  })
  .superRefine((data, ctx) => {
    const type = Number(data.customer_segment_margin_type);
    if (!type) return;

    if (type === 1) {
      const val = Number(data.spending_threshold);
      if (!Number.isFinite(val) || val <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El umbral debe ser mayor a 0",
          path: ["spending_threshold"],
        });
      }
    }

    if (type === 2) {
      const val = Number(data.seniority_months);
      if (!Number.isInteger(val) || val <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Debe ser al menos 1 mes",
          path: ["seniority_months"],
        });
      }
    }

    if (type === 3) {
      const val = Number(data.frequency_per_month);
      if (!Number.isInteger(val) || val <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Debe ser al menos 1 por mes",
          path: ["frequency_per_month"],
        });
      }
    }
  });

export type MarginFormData = z.infer<typeof marginSchema>;
