import type { CreateSaleRequest } from "@/interfaces/api/requests/CreateSaleRequest.interface";
import type { SaleItemPayload } from "@/interfaces/entities/Sale.interface";
import type { Promotion } from "@/interfaces/entities/Promotion.interface";

import { formatAmount, round2 } from "./create-sale.constants";
import type { CartItem, PaymentSplit } from "./create-sale.types";
import type { AppliedPromotion } from "./ApplyPromotionModal";
import { defaultPaymentMethod } from "./hooks/usePaymentSplits";

interface ValidateSaleParams {
  hasCustomer: boolean;
  isWalkInSale: boolean;
  branchId: string;
  cashRegisterId: string;
  itemsCount: number;
  usePoints: boolean;
  paymentSplits: PaymentSplit[];
  pointsRate: number;
  availablePoints: number;
  isApartado: boolean;
  isCredit: boolean;
  splitTotalInSaleCurrency: number;
  totalAmountDisplay: number;
  paymentBalance: number;
  dueDate: string;
  currencySymbol: string;
}

// Returns a user-facing error message, or null when the sale is ready to submit.
export function validateSale({
  hasCustomer,
  isWalkInSale,
  branchId,
  cashRegisterId,
  itemsCount,
  usePoints,
  paymentSplits,
  pointsRate,
  availablePoints,
  isApartado,
  isCredit,
  splitTotalInSaleCurrency,
  totalAmountDisplay,
  paymentBalance,
  dueDate,
  currencySymbol,
}: ValidateSaleParams): string | null {
  const hasCustomerOrWalkIn = hasCustomer || isWalkInSale;
  if (!hasCustomerOrWalkIn || !branchId || !cashRegisterId || itemsCount === 0) {
    return "Complete los datos antes de procesar la venta";
  }

  if (usePoints && !hasCustomer) {
    return "Debe asociar un cliente para usar puntos de fidelidad.";
  }

  const hasLoyaltySplit = paymentSplits.some(
    (s) => s.methodId === 5 && parseFloat(s.amount) > 0,
  );
  if (hasLoyaltySplit && !hasCustomer) {
    return "Debe asociar un cliente para usar puntos de fidelidad.";
  }

  if (hasLoyaltySplit && hasCustomer) {
    const totalLoyaltyAmount = paymentSplits
      .filter((s) => s.methodId === 5)
      .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    if (totalLoyaltyAmount > 0 && (pointsRate === 0 || availablePoints === 0)) {
      return "El cliente no tiene puntos disponibles para canjear.";
    }
    if (pointsRate > 0) {
      const pointsRequired = Math.round(totalLoyaltyAmount * pointsRate);
      if (pointsRequired > availablePoints) {
        return `Puntos insuficientes. Disponibles: ${availablePoints.toLocaleString("es-CR")}, requeridos: ${pointsRequired.toLocaleString("es-CR")}.`;
      }
    }
  }

  if (isApartado) {
    if (splitTotalInSaleCurrency <= 0) {
      return "Ingrese el abono inicial en la sección de métodos de pago (debe ser mayor a 0).";
    }
    if (splitTotalInSaleCurrency >= totalAmountDisplay - 0.01) {
      return "El abono inicial debe ser menor al total de la venta.";
    }
  }

  if (!isCredit && !isApartado && paymentBalance > 0.01) {
    return `Monto insuficiente. Falta: ${formatAmount(paymentBalance, currencySymbol)}`;
  }

  if (isCredit && !dueDate) {
    return "Ingrese la fecha límite de pago para ventas a crédito.";
  }

  if (isApartado && !dueDate) {
    return "Ingrese la fecha límite de pago para ventas en apartado.";
  }

  return null;
}

interface BuildSalePayloadParams {
  tenantId: string;
  branchId: string;
  cashRegisterId: string;
  cashRegisterSessionId: string;
  currencyId: number;
  customerId: string | null;
  saleCondition: string;
  isApartado: boolean;
  isCredit: boolean;
  sellerUserId: string | undefined;
  dueDate: string;
  adMessage: string;
  items: CartItem[];
  appliedPromotion: AppliedPromotion | null;
  defaultPromoDiscount: {
    total: number;
    perItem: Record<string, number>;
    source: Promotion | null;
  };
  convertCrcToSaleCurrency: (amount: number) => number;
  subtotalDisplay: number;
  taxAmountDisplay: number;
  totalAmountDisplay: number;
  splitTotalInSaleCurrency: number;
  paymentBalance: number;
  paymentSplits: PaymentSplit[];
  usePoints: boolean;
  actualPointsRedeemed: number;
  pointsCoveredDisplay: number;
  pointsRate: number;
}

export function buildSalePayload({
  tenantId,
  branchId,
  cashRegisterId,
  cashRegisterSessionId,
  currencyId,
  customerId,
  saleCondition,
  isApartado,
  isCredit,
  sellerUserId,
  dueDate,
  adMessage,
  items,
  appliedPromotion,
  defaultPromoDiscount,
  convertCrcToSaleCurrency,
  subtotalDisplay,
  taxAmountDisplay,
  totalAmountDisplay,
  splitTotalInSaleCurrency,
  paymentBalance,
  paymentSplits,
  usePoints,
  actualPointsRedeemed,
  pointsCoveredDisplay,
  pointsRate,
}: BuildSalePayloadParams): CreateSaleRequest {
  const now = new Date().toISOString();

  const itemsPayload: SaleItemPayload[] = items.map((item) => {
    const manualPart = appliedPromotion?.perItemDiscount[item.id] ?? 0;
    const defaultPart = defaultPromoDiscount.perItem[item.id] ?? 0;
    const itemDiscount = Number((manualPart + defaultPart).toFixed(2));
    const hasDiscount = itemDiscount > 0;
    const netUnitPriceCrc = hasDiscount
      ? round2(Math.max((item.total_price - itemDiscount) / item.quantity, 0))
      : item.unit_price;
    const netTotalCrc = hasDiscount
      ? round2(Math.max(item.total_price - itemDiscount, 0))
      : item.total_price;
    // Manual promo wins for the recorded promotion_id; fall back to the
    // first default promo that contributed if no manual was applied.
    const promotionId =
      manualPart > 0
        ? appliedPromotion?.promotionId
        : defaultPart > 0
          ? defaultPromoDiscount.source?.promotion_id
          : undefined;
    // Royalty (gifted) items keep their ROYALTY price type and audit ids,
    // and bypass promo recomputation since they are zero-priced.
    const isRoyalty = item.sale_price_type === "ROYALTY";
    return {
      tenant_id: tenantId,
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
      unit_price: convertCrcToSaleCurrency(netUnitPriceCrc),
      total_price: convertCrcToSaleCurrency(netTotalCrc),
      sale_price_type: isRoyalty ? "ROYALTY" : hasDiscount ? "PROMO" : "NORMAL",
      promotion_id: isRoyalty ? undefined : promotionId,
      royalty_option_id: item.royalty_option_id ?? null,
      royalty_rule_id: item.royalty_rule_id ?? null,
      original_price: hasDiscount
        ? convertCrcToSaleCurrency(item.unit_price)
        : undefined,
      discount_applied: hasDiscount ? convertCrcToSaleCurrency(itemDiscount) : 0,
    };
  });

  const amountPaid = splitTotalInSaleCurrency;
  const changeAmount =
    paymentBalance < -0.01 ? round2(Math.abs(paymentBalance)) : 0;

  return {
    tenant_id: tenantId,
    branch_id: branchId,
    cash_register_id: cashRegisterId,
    cash_register_session_id: cashRegisterSessionId || undefined,
    currency_id: currencyId,
    tenant_customer_id: customerId,
    sale_condition: saleCondition,
    sale_date: now,
    subtotal_amount: subtotalDisplay,
    tax_amount: taxAmountDisplay,
    total_amount: totalAmountDisplay,
    is_completed: !isApartado,
    seller_user_id: sellerUserId,
    due_date:
      (isApartado || isCredit) && dueDate
        ? dueDate
        : new Date().toISOString().slice(0, 10),
    ad_message: adMessage.trim() || undefined,
    amount_paid: amountPaid,
    change_amount: changeAmount,
    items: itemsPayload,
    payments: (() => {
      const rows = [];
      if (usePoints && actualPointsRedeemed > 0 && pointsCoveredDisplay > 0) {
        rows.push({
          tenant_customer_id: customerId ?? null,
          payment_method_id:
            paymentSplits[0]?.methodId ?? defaultPaymentMethod.value,
          is_points_redemption: true,
          points_redeemed: actualPointsRedeemed,
          points_to_currency_rate: pointsRate,
          payment_amount: pointsCoveredDisplay,
          payment_date: now,
          currency_id: currencyId,
          verified: true,
        });
      }
      for (const split of paymentSplits) {
        const amount = parseFloat(split.amount) || 0;
        if (amount > 0) {
          const isLoyaltyMethod = split.methodId === 5;
          const splitPointsRedeemed = isLoyaltyMethod
            ? Math.round(amount * pointsRate)
            : 0;
          rows.push({
            tenant_customer_id: customerId ?? null,
            payment_method_id: split.methodId,
            is_points_redemption: isLoyaltyMethod,
            points_redeemed: splitPointsRedeemed,
            points_to_currency_rate: isLoyaltyMethod ? pointsRate : 0,
            payment_amount: amount,
            payment_date: now,
            currency_id: split.currencyId,
            verified: true,
          });
        }
      }
      return rows;
    })(),
  };
}
