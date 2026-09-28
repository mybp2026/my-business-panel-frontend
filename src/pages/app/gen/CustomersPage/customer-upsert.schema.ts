import { z } from "zod";

const baseCustomerUpsertSchema = z.object({
  first_name: z.string().min(1, "Nombre es requerido"),
  last_name: z.string().min(1, "Apellido es requerido"),
  document_type_id: z.number().int().min(1, "Tipo de documento es requerido"),
  document_number: z.string().min(1, "Número de documento es requerido"),
  birthdate: z.string().optional().or(z.literal("")),
  economic_activity: z
    .string()
    .max(6, "Máximo 6 caracteres")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  segment_id: z.string().optional().or(z.literal("")),
  tenant_id: z.string().optional().or(z.literal("")),
});

export type CustomerUpsertFormData = z.infer<typeof baseCustomerUpsertSchema>;

export function buildCustomerUpsertSchema(requireTenant: boolean) {
  if (requireTenant) {
    return baseCustomerUpsertSchema.extend({
      tenant_id: z.string().min(1, "Empresa (Tenant) es requerida"),
    });
  }
  return baseCustomerUpsertSchema;
}
