export interface CreateCustomerRequest {
  tenant_id: string;
  first_name: string;
  last_name: string;
  /** Obligatoria cuando el tipo de documento es J/G/C. */
  business_name?: string;
  document_type_id: number;
  document_number: string;
  birthdate?: string;
  economic_activity?: string;
  email?: string;
  phone?: string;
  /** Obligatoria: la factura imprime el domicilio del comprador. */
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  segment_id?: number | null;
}
