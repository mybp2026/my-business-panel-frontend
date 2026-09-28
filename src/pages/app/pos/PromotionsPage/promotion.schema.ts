import { z } from "zod";

export const promotionRuleSchema = z
  .object({
    discount_percentage: z.coerce.number().min(0).max(100).optional(),
    discount_amount: z.coerce.number().min(0).optional(),
    buy_quantity: z.coerce.number().int().min(0).optional(),
    get_quantity: z.coerce.number().int().min(0).optional(),
    get_discount_percentage: z.coerce.number().min(0).max(100).optional(),
    min_quantity: z.coerce.number().int().min(0).optional(),
    max_quantity: z.coerce.number().int().min(0).optional(),
    tier_level: z.coerce.number().int().min(0).optional(),
    tier_min_quantity: z.coerce.number().int().min(0).optional(),
    tier_max_quantity: z.coerce.number().int().min(0).optional(),
    tier_price: z.coerce.number().min(0).optional(),
    tier_discount_percentage: z.coerce.number().min(0).max(100).optional(),
    min_purchase_amount: z.coerce.number().min(0).optional(),
  })
  .partial();

export const promotionFormSchema = z
  .object({
    promotion_name: z
      .string()
      .min(2, "El nombre es obligatorio")
      .max(100, "Máximo 100 caracteres"),
    promotion_code: z
      .string()
      .min(2, "El código es obligatorio")
      .max(50, "Máximo 50 caracteres"),
    promotion_description: z.string().max(500).optional().or(z.literal("")),
    promotion_type_id: z.coerce
      .number({ message: "Seleccione un tipo de promoción" })
      .int()
      .positive("Seleccione un tipo de promoción"),
    is_universal: z.boolean(),
    customer_segment_ids: z.array(z.number().int().positive()).optional(),
    promotion_start_date: z.string().min(1, "Fecha de inicio requerida"),
    promotion_end_date: z.string().min(1, "Fecha de fin requerida"),
    is_active: z.boolean(),
    is_default: z.boolean(),
    is_stackable: z.boolean(),
    target_group_ids: z.array(z.string().uuid()),
    rules: promotionRuleSchema,
  })
  .refine(
    (data) =>
      new Date(data.promotion_end_date) > new Date(data.promotion_start_date),
    {
      path: ["promotion_end_date"],
      message: "La fecha de fin debe ser posterior a la de inicio",
    },
  )
  .refine(
    (data) =>
      data.is_universal ||
      (data.customer_segment_ids && data.customer_segment_ids.length > 0),
    {
      path: ["customer_segment_ids"],
      message: "Seleccione al menos un segmento o elija 'Todos los segmentos'",
    },
  );

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;
