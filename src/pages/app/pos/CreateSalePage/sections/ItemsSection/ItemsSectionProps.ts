import type { UseFormReturn } from "react-hook-form";

import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { ProductVariantSelection } from "@/components/ui/ProductVariantComboBox";

import type { UseSaleCalculationsResult } from "../../hooks/useSaleCalculations";
import type { CartItem } from "../../create-sale.types";
import type { SaleItemForm } from "../../create-sale.schema";
import type { AppliedPromotion } from "../../ApplyPromotionModal";

export interface ItemsSectionProps {
  step: "lookup" | "items";
  tenantId: string;
  branchWarehouseId: string;
  itemForm: UseFormReturn<SaleItemForm>;
  selectedVariant: ProductVariantSelection | null;
  onVariantSelect: (selection: ProductVariantSelection) => void;
  onVariantClear: () => void;
  onAddItem: (data: SaleItemForm) => void;
  saleCondition: string;
  onSaleConditionChange: (value: string) => void;
  conditionOptions: { value: string; label: string }[];
  items: CartItem[];
  lastItemAmount: number;
  onOpenPromotionModal: () => void;
  appliedPromotion: AppliedPromotion | null;
  onRemovePromotion: () => void;
  calc: UseSaleCalculationsResult;
  effectiveExchangeRate: number;
  customer: Customer | null;
  isWalkInSale: boolean;
  onAddRoyaltyItems: (items: CartItem[]) => void;
  onQuantityChange: (itemId: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
}
