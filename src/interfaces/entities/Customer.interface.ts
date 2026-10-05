import type { Segment } from "./Segment.interface";

export type DocTypeCode = number;

export interface Customer {
  customer_id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  /** Razon social; se imprime en la factura cuando el cliente es J/G/C. */
  business_name?: string | null;
  identification_type: number;
  document_number: string;
  econ_activity?: string;
  birthdate?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  segment_id?: number;
  segment?: Segment;
  is_wholesale?: boolean;
  created_at: string;
  updated_at: string;
}
