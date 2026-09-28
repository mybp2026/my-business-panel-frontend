import { useCallback, useMemo } from "react";

import { currencies } from "@/constants/payment-methods";
import type { Promotion } from "@/interfaces/entities/Promotion.interface";
import {
  calculatePromotionDiscount,
  findMatchingTier,
  promotionAppliesToItem,
} from "@/utils/promotion";

import { round2, TAX_RATE, VES_CURRENCY_ID } from "../create-sale.constants";
import type { CartItem } from "../create-sale.types";
import type { AppliedPromotion } from "../ApplyPromotionModal";

interface UseSaleCalculationsParams {
  items: CartItem[];
  defaultPromotions: Promotion[];
  appliedPromotion: AppliedPromotion | null;
  currencyId: number;
  effectiveExchangeRate: number;
  usePoints: boolean;
  pointsToRedeem: number;
  pointsRate: number;
  availablePoints: number;
  loyaltyActive: boolean;
}

export interface UseSaleCalculationsResult {
  defaultPromoDiscount: {
    total: number;
    perItem: Record<string, number>;
    source: Promotion | null;
  };
  hasNonStackableDefault: boolean;
  grossSubtotal: number;
  manualDiscount: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currencySymbol: string;
  usdCatalogPriceToVes: (usdAmount: number) => number;
  convertCrcToSaleCurrency: (amount: number) => number;
  discountAmountDisplay: number;
  subtotalDisplay: number;
  taxAmountDisplay: number;
  totalAmountDisplay: number;
  totalInDollars: number | null;
  grossSubtotalInDollars: number | null;
  discountAmountInDollars: number | null;
  subtotalInDollars: number | null;
  maxPointsCrcValue: number;
  actualPointsRedeemed: number;
  pointsCoveredCrc: number;
  pointsCoveredDisplay: number;
  remainderDisplay: number;
}

// Re-evaluates active default promos against the current cart, plus every
// derived monetary value the sale needs (discounts, tax, currency display,
// loyalty-points coverage). Kept as one hook because every value here shares
// the same inputs (items/promotions/exchange rate) and is recomputed together
// on every cart change.
export function useSaleCalculations({
  items,
  defaultPromotions,
  appliedPromotion,
  currencyId,
  effectiveExchangeRate,
  usePoints,
  pointsToRedeem,
  pointsRate,
  availablePoints,
  loyaltyActive,
}: UseSaleCalculationsParams): UseSaleCalculationsResult {
  // Each item gets the maximum discount from any matching default promo (one
  // per item, not cumulative -- additive cumulation across multiple defaults
  // is not supported by the rule engine).
  const defaultPromoDiscount = useMemo(() => {
    if (defaultPromotions.length === 0 || items.length === 0) {
      return {
        total: 0,
        perItem: {} as Record<string, number>,
        source: null as Promotion | null,
      };
    }
    const grossForRule = items.reduce((acc, i) => acc + i.total_price, 0);
    const perItem: Record<string, number> = {};
    let total = 0;
    let appliedSource: Promotion | null = null;

    for (const item of items) {
      let bestDiscount = 0;
      for (const promo of defaultPromotions) {
        if (!promotionAppliesToItem(promo, item)) continue;
        if (!promo.type_name) continue;
        const rule =
          promo.type_name === "tiered_pricing"
            ? findMatchingTier(promo.rules ?? [], item.quantity)
            : (promo.rule ?? promo.rules?.[0]);
        if (!rule) continue;
        const result = calculatePromotionDiscount({
          type: promo.type_name,
          rule,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_purchase_amount: grossForRule,
        });
        if (result.success && result.discount_amount > bestDiscount) {
          bestDiscount = Math.min(result.discount_amount, item.total_price);
          if (!appliedSource) appliedSource = promo;
        }
      }
      if (bestDiscount > 0) {
        perItem[item.id] = Number(bestDiscount.toFixed(2));
        total += bestDiscount;
      }
    }

    return {
      total: Number(total.toFixed(2)),
      perItem,
      source: appliedSource,
    };
  }, [defaultPromotions, items]);

  // Any active default that disallows stacking blocks the cashier from
  // adding a manual promotion on top.
  const hasNonStackableDefault = useMemo(
    () => defaultPromotions.some((p) => p.is_stackable === false),
    [defaultPromotions],
  );

  const grossSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.total_price, 0),
    [items],
  );
  const manualDiscount = useMemo(
    () => Number((appliedPromotion?.totalDiscount ?? 0).toFixed(2)),
    [appliedPromotion],
  );
  const discountAmount = useMemo(
    () => Number((manualDiscount + defaultPromoDiscount.total).toFixed(2)),
    [manualDiscount, defaultPromoDiscount.total],
  );
  const subtotal = useMemo(
    () => Number(Math.max(grossSubtotal - discountAmount, 0).toFixed(2)),
    [grossSubtotal, discountAmount],
  );
  // Only apply IVA to items where includes_iva is false (price doesn't
  // include tax). Discount is applied proportionally to the taxable portion.
  const taxableGross = useMemo(
    () =>
      items.reduce(
        (acc, item) => (!item.includes_iva ? acc + item.total_price : acc),
        0,
      ),
    [items],
  );
  const taxAmount = useMemo(() => {
    if (grossSubtotal <= 0) return 0;
    const discountRatio = discountAmount / grossSubtotal;
    const taxableNet = taxableGross * (1 - discountRatio);
    return Number((taxableNet * TAX_RATE).toFixed(2));
  }, [taxableGross, grossSubtotal, discountAmount]);
  const totalAmount = useMemo(
    () => subtotal + taxAmount,
    [subtotal, taxAmount],
  );

  const currencySymbol =
    currencies.find((c) => c.value === currencyId)?.symbol ?? "Bs.";

  // El catálogo (product_variant.unit_price) se captura y almacena en USD
  // (moneda base, spec Venezuela). El carrito sigue operando en Bs. (CRC en
  // el nombre legado) como antes, así que cada producto se convierte a Bs.
  // en el momento en que entra al carrito con la tasa vigente.
  const usdCatalogPriceToVes = useCallback(
    (usdAmount: number) => round2(usdAmount * effectiveExchangeRate),
    [effectiveExchangeRate],
  );

  const convertCrcToSaleCurrency = useCallback(
    (amount: number) => {
      if (currencyId === VES_CURRENCY_ID) return round2(amount);
      if (effectiveExchangeRate <= 0) return round2(amount);
      return round2(amount / effectiveExchangeRate);
    },
    [currencyId, effectiveExchangeRate],
  );

  const discountAmountDisplay = useMemo(
    () => convertCrcToSaleCurrency(discountAmount),
    [convertCrcToSaleCurrency, discountAmount],
  );
  const subtotalDisplay = useMemo(
    () => convertCrcToSaleCurrency(subtotal),
    [convertCrcToSaleCurrency, subtotal],
  );
  const taxAmountDisplay = useMemo(
    () => convertCrcToSaleCurrency(taxAmount),
    [convertCrcToSaleCurrency, taxAmount],
  );
  const totalAmountDisplay = useMemo(
    () => convertCrcToSaleCurrency(totalAmount),
    [convertCrcToSaleCurrency, totalAmount],
  );
  const totalInDollars = useMemo(() => {
    if (effectiveExchangeRate <= 0) return null;
    return round2(totalAmount / effectiveExchangeRate);
  }, [effectiveExchangeRate, totalAmount]);

  // Equivalente en USD de cada card de monto del resumen. El carrito guarda
  // todo internamente en Bs. (grossSubtotal/discountAmount/subtotal), asi
  // que el equivalente en dolares se obtiene dividiendo por la tasa vigente.
  const grossSubtotalInDollars = useMemo(() => {
    if (effectiveExchangeRate <= 0) return null;
    return round2(grossSubtotal / effectiveExchangeRate);
  }, [effectiveExchangeRate, grossSubtotal]);
  const discountAmountInDollars = useMemo(() => {
    if (effectiveExchangeRate <= 0) return null;
    return round2(discountAmount / effectiveExchangeRate);
  }, [effectiveExchangeRate, discountAmount]);
  const subtotalInDollars = useMemo(() => {
    if (effectiveExchangeRate <= 0) return null;
    return round2(subtotal / effectiveExchangeRate);
  }, [effectiveExchangeRate, subtotal]);

  // Max monetary value coverable by available points (in CRC)
  const maxPointsCrcValue = loyaltyActive
    ? Math.floor(availablePoints / pointsRate)
    : 0;
  // Points actually redeemed = monetary coverage * pointsRate (in CRC)
  const actualPointsRedeemed =
    usePoints && loyaltyActive && pointsRate > 0
      ? Math.min(pointsToRedeem, availablePoints)
      : 0;
  const pointsCoveredCrc =
    actualPointsRedeemed > 0
      ? Math.floor(actualPointsRedeemed / pointsRate)
      : 0;
  const pointsCoveredDisplay = convertCrcToSaleCurrency(
    Math.min(pointsCoveredCrc, totalAmount),
  );
  const remainderDisplay = Math.max(
    round2(totalAmountDisplay - pointsCoveredDisplay),
    0,
  );

  return {
    defaultPromoDiscount,
    hasNonStackableDefault,
    grossSubtotal,
    manualDiscount,
    discountAmount,
    subtotal,
    taxAmount,
    totalAmount,
    currencySymbol,
    usdCatalogPriceToVes,
    convertCrcToSaleCurrency,
    discountAmountDisplay,
    subtotalDisplay,
    taxAmountDisplay,
    totalAmountDisplay,
    totalInDollars,
    grossSubtotalInDollars,
    discountAmountInDollars,
    subtotalInDollars,
    maxPointsCrcValue,
    actualPointsRedeemed,
    pointsCoveredCrc,
    pointsCoveredDisplay,
    remainderDisplay,
  };
}
