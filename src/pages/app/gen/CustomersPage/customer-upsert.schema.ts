import { z } from "zod";

import { isLegalPersonTypeId } from "@/utils/customerInvoice";

const baseCustomerUpsertSchema = z.object({
  first_name: z.string().min(1, "Nombre es requerido"),
  last_name: z.string().min(1, "Apellido es requerido"),
  business_name: z.string().optional().or(z.literal("")),
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
  // La factura imprime el domicilio del comprador.
  address: z.string().trim().min(1, "La dirección es requerida para facturar"),
  city: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  segment_id: z.string().optional().or(z.literal("")),
  tenant_id: z.string().optional().or(z.literal("")),
});

export type CustomerUpsertFormData = z.infer<typeof baseCustomerUpsertSchema>;

type SchemaShape = z.infer<typeof baseCustomerUpsertSchema>;

// Persona juridica (J/G/C): se factura por razon social.
const requireBusinessNameForLegalPerson = (
  data: SchemaShape,
  ctx: z.RefinementCtx,
) => {
  if (isLegalPersonTypeId(data.document_type_id) && !data.business_name?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["business_name"],
      message: "La razón social es requerida para RIF jurídico, gubernamental o consejo comunal",
    });
  }
};

export function buildCustomerUpsertSchema(requireTenant: boolean) {
  const schema = requireTenant
    ? baseCustomerUpsertSchema.extend({
        tenant_id: z.string().min(1, "Empresa (Tenant) es requerida"),
      })
    : baseCustomerUpsertSchema;

  return schema.superRefine(requireBusinessNameForLegalPerson);
}
