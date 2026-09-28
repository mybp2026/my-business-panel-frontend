import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { DocumentType } from "@/interfaces/entities/DocumentType.interface";

import type { UseCustomerLookupResult } from "../../hooks/useCustomerLookup";

export interface CustomerLookupSectionProps {
  customer: Customer | null;
  step: "lookup" | "items";
  isWalkInSale: boolean;
  isApartado: boolean;
  documentTypes: DocumentType[];
  lookup: UseCustomerLookupResult;
}
