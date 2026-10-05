import { identificationTypes } from "@/constants/identification-types";

// Persona juridica (J = RIF juridico, G = ente gubernamental, C = consejo
// comunal): se factura por razon social. Espejo de
// customer-invoice-requirements.ts en el backend.
const LEGAL_PERSON_CODES = ["J", "G", "C"];

export interface CustomerInvoiceFields {
  first_name?: string | null;
  last_name?: string | null;
  business_name?: string | null;
  document_number?: string | null;
  address?: string | null;
  identification_type?: number | null;
}

export const identificationCodeById = (id?: number | null): string | undefined =>
  identificationTypes.find((t) => t.value === Number(id))?.code;

export const isLegalPerson = (code?: string | null): boolean =>
  !!code && LEGAL_PERSON_CODES.includes(code.toUpperCase());

export const isLegalPersonTypeId = (id?: number | null): boolean =>
  isLegalPerson(identificationCodeById(id));

const isBlank = (value?: string | null) => !value || value.trim().length === 0;

/** Nombre que se imprime en la factura: razon social si existe, si no nombre y apellido. */
export const customerDisplayName = (
  customer: Pick<CustomerInvoiceFields, "first_name" | "last_name" | "business_name">,
): string =>
  customer.business_name?.trim() ||
  `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim();

/**
 * Campos que faltan para facturar a este cliente. Lista vacia = completo.
 * El backend aplica la misma regla en sale.service antes de crear la venta.
 */
export function missingInvoiceFields(customer: CustomerInvoiceFields): string[] {
  const missing: string[] = [];

  if (isBlank(customer.document_number)) missing.push("documento");

  if (isLegalPersonTypeId(customer.identification_type)) {
    if (isBlank(customer.business_name)) missing.push("razón social");
  } else if (isBlank(customer.first_name) || isBlank(customer.last_name)) {
    missing.push("nombre y apellido");
  }

  if (isBlank(customer.address)) missing.push("dirección");

  return missing;
}
