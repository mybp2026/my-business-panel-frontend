import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";

import type {
  Promotion,
  PromotionRule,
  PromotionType,
  PromotionTypeName,
} from "@/interfaces/entities/Promotion.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  ApplicableRoyaltyRule,
  GiftableProduct,
  RoyaltyOption,
} from "@/interfaces/entities/Royalty.interface";

import {
  calculatePromotionDiscount,
  findMatchingTier,
  isPromotionWithinDate,
  promotionAppliesToItem,
  promotionTypeLabel,
} from "@/utils/promotion";

import { promotionApi } from "@/api/promotion.api";
import { royaltyApi } from "@/api/royalty.api";
import { PromotionRuleFields } from "@/pages/app/PromotionsPage/PromotionRuleFields";

export interface AppliedPromotion {
  promotionId?: string;
  promotionName?: string;
  promotionType: PromotionTypeName;
  rule: PromotionRule;
  totalDiscount: number;
  perItemDiscount: Record<string, number>;
  description: string;
}

export interface CartItemForPromo {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  group_ids?: string[];
}

export interface RoyaltyGiftItem {
  id: string;
  product_variant_id: string;
  variant_name: string;
  quantity: number;
  unit_price: 0;
  total_price: 0;
  sale_price_type: "ROYALTY";
  royalty_option_id: string;
  royalty_rule_id: string;
}

interface RoyaltySelection {
  royalty_option_id: string;
  product_variant_id: string;
  product_name: string;
  quantity: number;
}

interface Props {
  isOpen: boolean;
  tenantId: string;
  cartItems: CartItemForPromo[];
  cartSubtotal: number;
  currencySymbol: string;
  totalAmount: number;
  onClose: () => void;
  onApply: (applied: AppliedPromotion) => void;
  onAddRoyaltyItems?: (items: RoyaltyGiftItem[]) => void;
}

const fmt = (v: number) =>
  `Bs. ${Number(v).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

const formatAmount = (value: number, symbol: string) =>
  `${symbol} ${value.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

export function ApplyPromotionModal({
  isOpen,
  tenantId,
  cartItems,
  cartSubtotal,
  currencySymbol,
  totalAmount,
  onClose,
  onApply,
  onAddRoyaltyItems,
}: Props) {
  const [types, setTypes] = useState<PromotionType[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>("");
  const [selectedTypeId, setSelectedTypeId] = useState<number>(0);
  const [rule, setRule] = useState<PromotionRule>({});
  const [tiers, setTiers] = useState<PromotionRule[]>([{}]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRule, setIsLoadingRule] = useState(false);
  const [isExistingPromo, setIsExistingPromo] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  // Royalty state
  const [royaltyRules, setRoyaltyRules] = useState<ApplicableRoyaltyRule[]>([]);
  const [royaltySelections, setRoyaltySelections] = useState<
    Record<string, RoyaltySelection | null>
  >({});
  const [royaltyGiftableCache, setRoyaltyGiftableCache] = useState<
    Record<string, GiftableProduct[]>
  >({});
  const [loadingRoyaltyGiftable, setLoadingRoyaltyGiftable] = useState<
    string | null
  >(null);
  const [isLoadingRoyalties, setIsLoadingRoyalties] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      promotionApi.getTypes().catch(() => [] as PromotionType[]),
      tenantId
        ? promotionApi.getByTenant(tenantId).catch(() => [] as Promotion[])
        : Promise.resolve<Promotion[]>([]),
    ])
      .then(([typesRes, promosRes]) => {
        if (cancelled) return;
        setTypes(typesRes);
        setActivePromotions(
          promosRes.filter(
            (p) =>
              p.is_active &&
              isPromotionWithinDate(
                p.promotion_start_date,
                p.promotion_end_date,
              ),
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantId]);

  // Load applicable royalty rules when modal opens or total changes
  useEffect(() => {
    if (!isOpen || !tenantId || totalAmount <= 0) {
      setRoyaltyRules([]);
      return;
    }
    let cancelled = false;
    setIsLoadingRoyalties(true);
    royaltyApi
      .getApplicableRules(tenantId, totalAmount)
      .then((rows) => {
        if (cancelled) return;
        setRoyaltyRules(rows);
        setRoyaltySelections((prev) => {
          const next: Record<string, RoyaltySelection | null> = {};
          for (const r of rows) {
            next[r.royalty_rule_id] = prev[r.royalty_rule_id] ?? null;
          }
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setRoyaltyRules([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRoyalties(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantId, totalAmount]);

  // Pre-load giftable products for every option's group. Backend recurses
  // descendants, so one fetch per group covers the whole subtree.
  useEffect(() => {
    for (const rule of royaltyRules) {
      for (const opt of rule.options) {
        if (!royaltyGiftableCache[opt.tenant_product_group_id]) {
          void loadRoyaltyGiftable(opt.tenant_product_group_id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [royaltyRules]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPromotionId("");
      setSelectedTypeId(0);
      setRule({});
      setTiers([{}]);
      setIsExistingPromo(false);
      setRoyaltySelections({});
    }
  }, [isOpen]);

  const loadRoyaltyGiftable = async (groupId: string) => {
    if (royaltyGiftableCache[groupId]) return;
    setLoadingRoyaltyGiftable(groupId);
    try {
      const products = await royaltyApi.getGiftableProducts(groupId);
      setRoyaltyGiftableCache((prev) => ({ ...prev, [groupId]: products }));
    } finally {
      setLoadingRoyaltyGiftable(null);
    }
  };

  const handleRoyaltyOptionSelect = async (
    ruleId: string,
    opt: RoyaltyOption | undefined,
  ) => {
    if (!opt) {
      setRoyaltySelections((prev) => ({ ...prev, [ruleId]: null }));
      return;
    }
    const rule = royaltyRules.find((r) => r.royalty_rule_id === ruleId);
    const maxQty = rule ? opt.quantity * rule.multiplier : opt.quantity;
    setRoyaltySelections((prev) => ({
      ...prev,
      [ruleId]: {
        royalty_option_id: opt.royalty_option_id,
        product_variant_id: "",
        product_name: "",
        quantity: maxQty,
      },
    }));
    await loadRoyaltyGiftable(opt.tenant_product_group_id);
  };

  const handleRoyaltyProductSelect = (
    ruleId: string,
    productVariantId: string,
    productName: string,
  ) => {
    setRoyaltySelections((prev) => {
      const current = prev[ruleId];
      if (!current) return prev;
      return { ...prev, [ruleId]: { ...current, product_variant_id: productVariantId, product_name: productName } };
    });
  };

  const handleRoyaltyQuantityChange = (ruleId: string, qty: number) => {
    setRoyaltySelections((prev) => {
      const current = prev[ruleId];
      if (!current) return prev;
      return { ...prev, [ruleId]: { ...current, quantity: qty } };
    });
  };

  const selectedType = types.find(
    (t) => t.promotion_type_id === selectedTypeId,
  );
  const selectedTypeName = (selectedType?.type_name ?? "") as
    | PromotionTypeName
    | "";
  const isTieredPricing = selectedTypeName === "tiered_pricing";

  const handleSelectExisting = async (promotionId: string) => {
    setSelectedPromotionId(promotionId);

    if (!promotionId) {
      setIsExistingPromo(false);
      setRule({});
      setTiers([{}]);
      return;
    }

    const promo = activePromotions.find((p) => p.promotion_id === promotionId);
    if (!promo) return;

    const matchedType = types.find((t) => t.type_name === promo.type_name);
    if (matchedType) setSelectedTypeId(matchedType.promotion_type_id);

    setIsExistingPromo(true);

    try {
      setIsLoadingRule(true);
      const detail = await promotionApi.getInfo(promotionId);

      if (promo.type_name === "tiered_pricing") {
        const loadedTiers = (detail?.rules ?? [])
          .filter((r) => r.tier_level != null)
          .sort((a, b) => (a.tier_level ?? 0) - (b.tier_level ?? 0));
        setTiers(loadedTiers.length > 0 ? loadedTiers : detail?.rule ? [detail.rule] : [{}]);
        setRule({});
      } else {
        setRule(detail?.rule ?? {});
        setTiers([{}]);
        if (!detail?.rule) {
          setToast({
            mode: "error",
            message: "La promoción no tiene una regla configurada",
          });
        }
      }
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al obtener la regla de la promoción",
      });
    } finally {
      setIsLoadingRule(false);
    }
  };

  const selectedPromotion = useMemo(
    () =>
      activePromotions.find((p) => p.promotion_id === selectedPromotionId) ??
      null,
    [activePromotions, selectedPromotionId],
  );

  const preview = useMemo(() => {
    if (!selectedTypeName) return null;
    let total = 0;
    const perItem: Record<string, number> = {};
    const matchedTierByItem: Record<string, PromotionRule> = {};

    for (const item of cartItems) {
      if (selectedPromotion && !promotionAppliesToItem(selectedPromotion, item))
        continue;

      let result;
      let usedRule: PromotionRule = rule;

      if (isTieredPricing) {
        const matchingTier = findMatchingTier(tiers, item.quantity);
        if (!matchingTier) continue;
        usedRule = matchingTier;
        result = calculatePromotionDiscount({
          type: selectedTypeName,
          rule: matchingTier,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_purchase_amount: cartSubtotal,
        });
      } else {
        result = calculatePromotionDiscount({
          type: selectedTypeName,
          rule,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_purchase_amount: cartSubtotal,
        });
      }

      if (result.success && result.discount_amount > 0) {
        const capped = Math.min(result.discount_amount, item.total_price);
        perItem[item.id] = Number(capped.toFixed(2));
        matchedTierByItem[item.id] = usedRule;
        total += capped;
      }
    }

    return {
      total: Number(total.toFixed(2)),
      perItem,
      matchedTierByItem,
    };
  }, [
    cartItems,
    cartSubtotal,
    rule,
    tiers,
    selectedTypeName,
    isTieredPricing,
    selectedPromotion,
  ]);

  const selectedRoyaltyItems = useMemo<RoyaltyGiftItem[]>(() => {
    const result: RoyaltyGiftItem[] = [];
    for (const rule of royaltyRules) {
      const sel = royaltySelections[rule.royalty_rule_id];
      if (!sel?.product_variant_id || sel.quantity <= 0) continue;
      result.push({
        id: `royalty-${rule.royalty_rule_id}-${sel.royalty_option_id}-${Date.now()}`,
        product_variant_id: sel.product_variant_id,
        variant_name: `[Regalia] ${sel.product_name}`,
        quantity: sel.quantity,
        unit_price: 0,
        total_price: 0,
        sale_price_type: "ROYALTY",
        royalty_option_id: sel.royalty_option_id,
        royalty_rule_id: rule.royalty_rule_id,
      });
    }
    return result;
  }, [royaltyRules, royaltySelections]);

  const hasRoyaltySelection = selectedRoyaltyItems.length > 0;

  const handleApply = () => {
    const hasPromo = !!selectedTypeName;
    const hasRoyalties = hasRoyaltySelection;

    if (!hasPromo && !hasRoyalties) {
      setToast({
        mode: "error",
        message: "Seleccione un tipo de promoción o una regalía para aplicar",
      });
      return;
    }

    if (hasPromo) {
      if (!preview || preview.total <= 0) {
        if (!hasRoyalties) {
          setToast({
            mode: "error",
            message:
              "La promoción no genera descuento sobre el carrito actual. Verifique los campos.",
          });
          return;
        }
      } else {
        const promo = activePromotions.find(
          (p) => p.promotion_id === selectedPromotionId,
        );
        const firstMatchedTier = Object.values(
          preview.matchedTierByItem ?? {},
        )[0];
        const effectiveRule = isTieredPricing
          ? (firstMatchedTier ?? tiers[0] ?? {})
          : rule;
        onApply({
          promotionId: selectedPromotionId || undefined,
          promotionName: promo?.promotion_name,
          promotionType: selectedTypeName,
          rule: effectiveRule,
          totalDiscount: preview.total,
          perItemDiscount: preview.perItem,
          description: promo?.promotion_name
            ? `${promo.promotion_name} (${promotionTypeLabel(selectedTypeName)})`
            : promotionTypeLabel(selectedTypeName),
        });
      }
    }

    if (hasRoyalties && onAddRoyaltyItems) {
      onAddRoyaltyItems(selectedRoyaltyItems);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Aplicar promoción y regalías"
      size="lg"
    >
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Promotion section ── */}
          {activePromotions.length > 0 && (
            <div>
              <Select
                label="Promoción existente (opcional)"
                value={selectedPromotionId}
                onChange={(e) => handleSelectExisting(e.target.value)}
                options={[
                  { value: "", label: "Aplicar promoción ad-hoc" },
                  ...activePromotions.map((p) => ({
                    value: p.promotion_id,
                    label: `${p.promotion_name} — ${promotionTypeLabel(p.type_name)}`,
                  })),
                ]}
                placeholder="Aplicar promoción ad-hoc"
              />
              <p className="mt-1 text-xs text-gray-500">
                Seleccione una promoción registrada o configure una manual al
                vuelo.
              </p>
            </div>
          )}

          <Select
            label="Tipo de promoción"
            value={String(selectedTypeId || "")}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedTypeId(id);
              setRule({});
              setTiers([{}]);
              setSelectedPromotionId("");
              setIsExistingPromo(false);
            }}
            options={types.map((t) => ({
              value: t.promotion_type_id,
              label: promotionTypeLabel(t.type_name),
            }))}
            placeholder="Seleccionar tipo (opcional si aplica regalía)"
            disabled={isExistingPromo}
          />

          {selectedTypeName && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  {isExistingPromo
                    ? "Regla de la promoción seleccionada"
                    : "Campos de la promoción"}
                </p>
                {isLoadingRule && (
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                )}
              </div>
              <PromotionRuleFields
                type={selectedTypeName}
                rule={rule}
                tiers={isTieredPricing ? tiers : undefined}
                onChange={setRule}
                onTiersChange={isTieredPricing ? setTiers : undefined}
                disabled={isExistingPromo}
              />
            </div>
          )}

          {selectedTypeName && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-700">
                Descuento estimado sobre el carrito
              </p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                {formatAmount(preview?.total ?? 0, currencySymbol)}
              </p>
              {preview && preview.total === 0 && selectedTypeName && (
                <p className="text-xs text-emerald-700 mt-1">
                  Ningún producto cumple los requisitos para esta promoción.
                </p>
              )}
            </div>
          )}

          {/* ── Royalty section ── */}
          {totalAmount > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Regalías aplicables
                </p>
                {isLoadingRoyalties && (
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                )}
              </div>

              {!isLoadingRoyalties && royaltyRules.length === 0 && (
                <p className="text-xs text-gray-400">
                  No hay regalías configuradas para este monto de compra.
                </p>
              )}

              <div className="flex flex-col gap-3">
                {royaltyRules.map((r) => {
                  const sel = royaltySelections[r.royalty_rule_id];
                  const selectedOpt = sel
                    ? r.options.find(
                        (o) => o.royalty_option_id === sel.royalty_option_id,
                      )
                    : null;

                  const maxQty = selectedOpt
                    ? selectedOpt.quantity * r.multiplier
                    : 1;

                  const productOptions = selectedOpt
                    ? (
                        royaltyGiftableCache[
                          selectedOpt.tenant_product_group_id
                        ] ?? []
                      ).map((p) => ({
                        value: p.product_variant_id,
                        label: p.variant_name,
                      }))
                    : [];

                  return (
                    <div
                      key={r.royalty_rule_id}
                      className="border border-amber-200 rounded-xl p-3 bg-amber-50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-700">
                          Desde {fmt(r.min_amount)}
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-700 rounded-md px-2 py-0.5 font-medium">
                          ×{r.multiplier}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select
                          label="Grupo de producto"
                          value={sel?.royalty_option_id ?? ""}
                          onChange={(e) => {
                            const opt = r.options.find(
                              (o) => o.royalty_option_id === e.target.value,
                            );
                            void handleRoyaltyOptionSelect(r.royalty_rule_id, opt);
                          }}
                          options={[
                            { value: "", label: "Elige un grupo" },
                            ...r.options.map((o) => ({
                              value: o.royalty_option_id,
                              label: `${o.group_name} - ${o.quantity} u.`,
                            })),
                          ]}
                        />

                        {selectedOpt && (
                          <div>
                            {loadingRoyaltyGiftable ===
                            selectedOpt.tenant_product_group_id ? (
                              <p className="text-xs text-gray-400 pt-6">
                                Cargando productos...
                              </p>
                            ) : productOptions.length === 0 ? (
                              <p className="text-xs text-gray-400 pt-6">
                                Sin productos disponibles
                              </p>
                            ) : (
                              <Select
                                label="Producto a regalar"
                                value={sel?.product_variant_id ?? ""}
                                onChange={(e) => {
                                  const label =
                                    productOptions.find(
                                      (p) => p.value === e.target.value,
                                    )?.label ?? "";
                                  handleRoyaltyProductSelect(
                                    r.royalty_rule_id,
                                    e.target.value,
                                    label,
                                  );
                                }}
                                options={[
                                  {
                                    value: "",
                                    label: "Seleccionar producto",
                                  },
                                  ...productOptions,
                                ]}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {sel?.product_variant_id && selectedOpt && (
                        <div className="mt-2">
                          <Input
                            label="Cantidad a regalar"
                            type="number"
                            min={1}
                            max={maxQty}
                            value={sel.quantity}
                            onChange={(e) => {
                              const v = Math.min(
                                Math.max(parseInt(e.target.value) || 1, 1),
                                maxQty,
                              );
                              handleRoyaltyQuantityChange(r.royalty_rule_id, v);
                            }}
                            hint={`Máximo permitido: ${maxQty} unidad${maxQty !== 1 ? "es" : ""}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {hasRoyaltySelection && (
                <p className="text-xs text-amber-700 mt-2 font-medium">
                  {selectedRoyaltyItems.reduce((s, i) => s + i.quantity, 0)}{" "}
                  unidad(es) de regalía seleccionada(s)
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              disabled={
                !hasRoyaltySelection &&
                (!preview || preview.total <= 0)
              }
            >
              {selectedTypeName && hasRoyaltySelection
                ? "Aplicar promoción y regalías"
                : hasRoyaltySelection
                  ? "Agregar regalías"
                  : "Aplicar promoción"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
