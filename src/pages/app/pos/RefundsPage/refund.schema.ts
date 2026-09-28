import { z } from "zod";

export const refundFormSchema = z.object({
  invoice_id: z.string().uuid("ID de factura digital inválido"),
  tenant_customer_id: z.string().uuid("ID de cliente inválido"),
  total_refund_amount: z.number().min(0.01, "Monto inválido"),
  refund_method: z.number().int().min(1, "Método inválido"),
  return_status_id: z.number().int().min(1, "Estado inválido"),
  return_date: z.string().min(1, "Fecha requerida"),
});

export type RefundFormData = z.infer<typeof refundFormSchema>;

export const returnProductSchema = z.object({
  sale_item_id: z.string().uuid("ID de ítem de venta inválido"),
  quantity: z.number().int().min(1, "Cantidad mínima 1"),
  unit_price: z.number().min(0, "Precio inválido"),
});

export type ReturnProductFormData = z.infer<typeof returnProductSchema>;
