import { z } from "zod";

import { isLegalPersonTypeId } from "@/utils/customerInvoice";

export const customerLookupSchema = z.object({
  document_number: z.string().min(1, "Número de documento requerido"),
});
export type CustomerLookupForm = z.infer<typeof customerLookupSchema>;

export const inlineCustomerSchema = z
  .object({
    first_name: z.string().min(1, "Nombre requerido"),
    last_name: z.string().min(1, "Apellido requerido"),
    business_name: z.string().optional(),
    document_type_id: z.number().int().min(1, "Tipo requerido"),
    document_number: z.string().min(1, "Número requerido"),
    email: z.string().email("Email inválido").or(z.literal("")).optional(),
    phone: z.string().optional(),
    // La factura imprime el domicilio del comprador.
    address: z.string().trim().min(1, "Dirección requerida para facturar"),
  })
  .superRefine((data, ctx) => {
    if (isLegalPersonTypeId(data.document_type_id) && !data.business_name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["business_name"],
        message: "Razón social requerida para RIF jurídico, gubernamental o consejo comunal",
      });
    }
  });
export type InlineCustomerForm = z.infer<typeof inlineCustomerSchema>;

export const saleItemSchema = z.object({
  product_variant_id: z.string().min(1, "Producto requerido"),
  quantity: z.number().int().min(1, "Cantidad mínima 1"),
  unit_price: z.number().min(0, "Precio inválido"),
});
export type SaleItemForm = z.infer<typeof saleItemSchema>;
