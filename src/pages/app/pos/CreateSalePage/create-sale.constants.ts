import type { ProductVariantSelection } from "@/components/ui/ProductVariantComboBox";

import type { InlineCustomerForm } from "./create-sale.schema";

export const TAX_RATE = 0.16;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Moneda base del sistema (Venezuela). Antes se llamaba VES_CURRENCY_ID
// por el legado de Costa Rica, apuntando al mismo id.
export const VES_CURRENCY_ID = 1;

export const formatAmount = (value: number, symbol: string) =>
  `${symbol} ${value.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;

export const round2 = (value: number) => Number(value.toFixed(2));

export const blankCustomer = (): InlineCustomerForm => ({
  first_name: "",
  last_name: "",
  document_type_id: 1,
  document_number: "",
  email: "",
  phone: "",
});

export const buildVariantLabel = (selection: ProductVariantSelection) =>
  selection.sku
    ? `${selection.variant_name} (${selection.sku})`
    : selection.variant_name;
