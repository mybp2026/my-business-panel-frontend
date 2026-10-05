export interface UpdateCustomerRequest {
  first_name?: string;
  last_name?: string;
  business_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  segment_id?: number | null;
}
