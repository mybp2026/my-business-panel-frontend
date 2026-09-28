import { useEffect, useState } from "react";
import { royaltyApi } from "@/api/royalty.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Customer } from "@/interfaces/entities/Customer.interface";
import type {
  ApplicableRoyaltyRule,
  GiftableProduct,
  RoyaltyOption,
} from "@/interfaces/entities/Royalty.interface";

interface CartItem {
  id: string;
  product_variant_id: string;
  variant_name: string;
  sku?: string;
  group_ids?: string[];
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_price_type?: "NORMAL" | "PROMO" | "SEGMENT" | "MANUAL" | "ROYALTY";
  royalty_option_id?: string | null;
  royalty_rule_id?: string | null;
}

interface Props {
  customer: Customer | null;
  tenantId: string;
  totalAmount: number;
  onAddItems: (items: CartItem[]) => void;
}

const fmt = (v: number) =>
  `CRC ${Number(v).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;

export function RoyaltyPanel({ customer, tenantId, totalAmount, onAddItems }: Props) {
  const isWholesale = !!customer?.is_wholesale;

  const [rules, setRules] = useState<ApplicableRoyaltyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [giftableCache, setGiftableCache] = useState<Record<string, GiftableProduct[]>>({});
  const [loadingGiftable, setLoadingGiftable] = useState<string | null>(null);

  // Per-rule selections
  const [selections, setSelections] = useState<
    Record<
      string,
      {
        royalty_option_id: string;
        product_variant_id: string;
        product_name: string;
      } | null
    >
  >({});

  // Per-rule, per-option quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Load applicable rules whenever customer / amount changes
  useEffect(() => {
    if (!isWholesale || !tenantId || totalAmount <= 0) {
      setRules([]);
      setSelections({});
      setQuantities({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    royaltyApi
      .getApplicableRules(tenantId, totalAmount)
      .then((rows) => {
        if (cancelled) return;
        setRules(rows);
        setSelections((prev) => {
          const next: typeof prev = {};
          for (const r of rows) {
            next[r.royalty_rule_id] = prev[r.royalty_rule_id] ?? null;
          }
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setRules([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isWholesale, tenantId, totalAmount]);

  // Pre-load giftable products for every option of every rule. Backend
  // already recurses into descendant groups, so one fetch per group covers
  // the whole subtree.
  useEffect(() => {
    for (const rule of rules) {
      for (const opt of rule.options) {
        if (!giftableCache[opt.tenant_product_group_id]) {
          void loadGiftable(opt.tenant_product_group_id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  const loadGiftable = async (groupId: string) => {
    if (giftableCache[groupId]) return;
    setLoadingGiftable(groupId);
    try {
      const products = await royaltyApi.getGiftableProducts(groupId);
      setGiftableCache((prev) => ({ ...prev, [groupId]: products }));
    } finally {
      setLoadingGiftable(null);
    }
  };

  const handleOptionSelect = (ruleId: string, opt: RoyaltyOption, multiplier: number) => {
    const maxQty = opt.quantity * multiplier;
    setSelections((prev) => ({
      ...prev,
      [ruleId]: {
        royalty_option_id: opt.royalty_option_id,
        product_variant_id: "",
        product_name: "",
      },
    }));
    setQuantities((prev) => ({
      ...prev,
      [`${ruleId}-${opt.royalty_option_id}`]: maxQty,
    }));
  };

  const handleProductSelect = (
    ruleId: string,
    optionId: string,
    productVariantId: string,
    productName: string,
  ) => {
    setSelections((prev) => ({
      ...prev,
      [ruleId]: {
        royalty_option_id: optionId,
        product_variant_id: productVariantId,
        product_name: productName,
      },
    }));
  };

  const handleAddToCart = () => {
    const newItems: CartItem[] = [];

    for (const rule of rules) {
      const sel = selections[rule.royalty_rule_id];
      if (!sel?.product_variant_id) continue;

      const opt = rule.options.find(
        (o) => o.royalty_option_id === sel.royalty_option_id,
      );
      if (!opt) continue;

      const maxQty = opt.quantity * rule.multiplier;
      const qtyKey = `${rule.royalty_rule_id}-${opt.royalty_option_id}`;
      const selectedQty = quantities[qtyKey] ?? maxQty;
      const qty = Math.min(Math.max(selectedQty, 1), maxQty);

      newItems.push({
        id: `royalty-${rule.royalty_rule_id}-${sel.royalty_option_id}-${Date.now()}`,
        product_variant_id: sel.product_variant_id,
        variant_name: `[Regalia] ${sel.product_name}`,
        quantity: qty,
        unit_price: 0,
        total_price: 0,
        sale_price_type: "ROYALTY",
        royalty_option_id: sel.royalty_option_id,
        royalty_rule_id: rule.royalty_rule_id,
      });
    }

    if (newItems.length === 0) return;
    onAddItems(newItems);
    setSelections((prev) => {
      const next: typeof prev = {};
      for (const key of Object.keys(prev)) next[key] = null;
      return next;
    });
    setQuantities({});
  };

  const allRulesHaveSelection =
    rules.length > 0 &&
    rules.every((r) => {
      const sel = selections[r.royalty_rule_id];
      return sel?.product_variant_id;
    });

  if (!isWholesale) return null;
  if (!loading && rules.length === 0 && totalAmount > 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-amber-800">
          Regalias aplicables
        </span>
        {loading && <span className="text-xs text-amber-600">Cargando...</span>}
      </div>

      {!loading && rules.length === 0 && (
        <p className="text-xs text-amber-700">
          El cliente mayorista no alcanza ninguna escala de regalias con este
          monto.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {rules.map((rule) => {
          const sel = selections[rule.royalty_rule_id];
          const selectedOpt = sel
            ? rule.options.find(
                (o) => o.royalty_option_id === sel.royalty_option_id,
              )
            : null;

          const maxQty = selectedOpt ? selectedOpt.quantity * rule.multiplier : 1;
          const qtyKey = `${rule.royalty_rule_id}-${selectedOpt?.royalty_option_id ?? ""}`;
          const currentQty = quantities[qtyKey] ?? maxQty;

          const productOptions = selectedOpt
            ? (giftableCache[selectedOpt.tenant_product_group_id] ?? []).map(
                (p) => ({
                  value: p.product_variant_id,
                  label: p.variant_name,
                }),
              )
            : [];

          const optionSelectOptions = [
            { value: "", label: "Elige un grupo" },
            ...rule.options.map((o) => ({
              value: o.royalty_option_id,
              label: `${o.group_name} - ${o.quantity} unidad${o.quantity !== 1 ? "es" : ""}`,
            })),
          ];

          return (
            <div
              key={rule.royalty_rule_id}
              className="bg-white rounded-xl border border-amber-200 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  Desde {fmt(rule.min_amount)}
                </span>
                <span className="text-xs bg-amber-100 text-amber-700 rounded-md px-2 py-0.5 font-medium">
                  x{rule.multiplier}
                </span>
                <span className="text-xs text-gray-400">
                  aplica {rule.multiplier} vez
                  {rule.multiplier !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select
                  label="Grupo de producto"
                  value={sel?.royalty_option_id ?? ""}
                  onChange={(e) => {
                    const opt = rule.options.find(
                      (o) => o.royalty_option_id === e.target.value,
                    );
                    if (opt) {
                      handleOptionSelect(rule.royalty_rule_id, opt, rule.multiplier);
                      void loadGiftable(opt.tenant_product_group_id);
                    } else {
                      setSelections((prev) => ({
                        ...prev,
                        [rule.royalty_rule_id]: null,
                      }));
                    }
                  }}
                  options={optionSelectOptions}
                />

                {selectedOpt && (
                  <div>
                    {loadingGiftable === selectedOpt.tenant_product_group_id ? (
                      <p className="text-xs text-gray-400 pt-6">
                        Cargando productos...
                      </p>
                    ) : productOptions.length === 0 ? (
                      <p className="text-xs text-gray-400 pt-6">
                        Sin productos regalables en este grupo
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
                          handleProductSelect(
                            rule.royalty_rule_id,
                            selectedOpt.royalty_option_id,
                            e.target.value,
                            label,
                          );
                        }}
                        options={[
                          { value: "", label: "Seleccionar producto" },
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
                    value={currentQty}
                    onChange={(e) => {
                      const v = Math.min(
                        Math.max(parseInt(e.target.value) || 1, 1),
                        maxQty,
                      );
                      setQuantities((prev) => ({ ...prev, [qtyKey]: v }));
                    }}
                    hint={`Maximo: ${maxQty} unidad${maxQty !== 1 ? "es" : ""}`}
                  />
                </div>
              )}

              {sel?.product_variant_id && selectedOpt && (
                <p className="text-xs text-emerald-700 mt-1 font-medium">
                  Se agregaran {quantities[qtyKey] ?? maxQty} unidad
                  {(quantities[qtyKey] ?? maxQty) !== 1 ? "es" : ""} gratis
                </p>
              )}
            </div>
          );
        })}
      </div>

      {rules.length > 0 && (
        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            disabled={!allRulesHaveSelection}
            onClick={handleAddToCart}
          >
            Agregar regalias al carrito
          </Button>
          {!allRulesHaveSelection && (
            <p className="text-xs text-amber-600 mt-1">
              Selecciona un grupo y producto para cada regla
            </p>
          )}
        </div>
      )}
    </div>
  );
}
