import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import type {
  PromotionRule,
  PromotionTypeName,
} from "@/interfaces/entities/Promotion.interface";

interface Props {
  type: PromotionTypeName | "";
  rule: PromotionRule;
  tiers?: PromotionRule[];
  errors?: Partial<Record<keyof PromotionRule, string>>;
  disabled?: boolean;
  onChange: (next: PromotionRule) => void;
  onTiersChange?: (tiers: PromotionRule[]) => void;
}

const numberOrUndefined = (raw: string): number | undefined =>
  raw === "" ? undefined : Number(raw);

export function PromotionRuleFields({
  type,
  rule,
  tiers,
  errors,
  disabled,
  onChange,
  onTiersChange,
}: Props) {
  const set = <K extends keyof PromotionRule>(
    key: K,
    value: PromotionRule[K],
  ) => onChange({ ...rule, [key]: value });

  if (!type) {
    return (
      <p className="text-sm text-gray-500">
        Seleccione un tipo de promoción para ver los campos aplicables.
      </p>
    );
  }

  if (type === "free_shipping") {
    return (
      <p className="text-sm text-gray-500">
        Envío gratis no requiere reglas adicionales (no aplica a productos en
        línea de venta).
      </p>
    );
  }

  switch (type) {
    case "percentage_discount":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Porcentaje de descuento (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={rule.discount_percentage ?? ""}
            onChange={(e) =>
              set("discount_percentage", numberOrUndefined(e.target.value))
            }
            error={errors?.discount_percentage}
            disabled={disabled}
            required
          />
          <Input
            label="Monto mínimo de compra"
            type="number"
            min={0}
            step="0.01"
            value={rule.min_purchase_amount ?? ""}
            onChange={(e) =>
              set("min_purchase_amount", numberOrUndefined(e.target.value))
            }
            error={errors?.min_purchase_amount}
            disabled={disabled}
          />
        </div>
      );

    case "fixed_amount_discount":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Monto del descuento"
            type="number"
            min={0}
            step="0.01"
            value={rule.discount_amount ?? ""}
            onChange={(e) =>
              set("discount_amount", numberOrUndefined(e.target.value))
            }
            error={errors?.discount_amount}
            disabled={disabled}
            required
          />
          <Input
            label="Monto mínimo de compra"
            type="number"
            min={0}
            step="0.01"
            value={rule.min_purchase_amount ?? ""}
            onChange={(e) =>
              set("min_purchase_amount", numberOrUndefined(e.target.value))
            }
            error={errors?.min_purchase_amount}
            disabled={disabled}
          />
        </div>
      );

    case "buy_x_get_y":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Cantidad a comprar (X)"
            type="number"
            min={1}
            step="1"
            value={rule.buy_quantity ?? ""}
            onChange={(e) =>
              set("buy_quantity", numberOrUndefined(e.target.value))
            }
            error={errors?.buy_quantity}
            disabled={disabled}
            required
          />
          <Input
            label="Cantidad a regalar (Y)"
            type="number"
            min={1}
            step="1"
            value={rule.get_quantity ?? ""}
            onChange={(e) =>
              set("get_quantity", numberOrUndefined(e.target.value))
            }
            error={errors?.get_quantity}
            disabled={disabled}
            required
          />
          <Input
            label="% sobre Y (100 = gratis)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={rule.get_discount_percentage ?? 100}
            onChange={(e) =>
              set("get_discount_percentage", numberOrUndefined(e.target.value))
            }
            error={errors?.get_discount_percentage}
            disabled={disabled}
          />
        </div>
      );

    case "volume_discount":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Cantidad mínima"
            type="number"
            min={1}
            step="1"
            value={rule.min_quantity ?? ""}
            onChange={(e) =>
              set("min_quantity", numberOrUndefined(e.target.value))
            }
            error={errors?.min_quantity}
            disabled={disabled}
            required
          />
          <Input
            label="Cantidad máxima"
            type="number"
            min={0}
            step="1"
            value={rule.max_quantity ?? ""}
            onChange={(e) =>
              set("max_quantity", numberOrUndefined(e.target.value))
            }
            error={errors?.max_quantity}
            disabled={disabled}
          />
          <Input
            label="Porcentaje de descuento (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={rule.discount_percentage ?? ""}
            onChange={(e) =>
              set("discount_percentage", numberOrUndefined(e.target.value))
            }
            error={errors?.discount_percentage}
            disabled={disabled}
            required
          />
        </div>
      );

    case "tiered_pricing": {
      const activeTiers = tiers && tiers.length > 0 ? tiers : [{}];
      const updateTier = (index: number, patch: Partial<PromotionRule>) => {
        const next = activeTiers.map((t, i) =>
          i === index ? { ...t, ...patch, tier_level: i + 1 } : t,
        );
        onTiersChange?.(next);
      };
      const addTier = () =>
        onTiersChange?.([...activeTiers, { tier_level: activeTiers.length + 1 }]);
      const removeTier = (index: number) =>
        onTiersChange?.(
          activeTiers
            .filter((_, i) => i !== index)
            .map((t, i) => ({ ...t, tier_level: i + 1 })),
        );

      return (
        <div className="space-y-3">
          {activeTiers.map((tier, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-3 bg-gray-50/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">
                  Nivel {index + 1}
                </span>
                {activeTiers.length > 1 && !disabled && (
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Quitar nivel
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="Cantidad mínima"
                  type="number"
                  min={1}
                  step="1"
                  value={tier.tier_min_quantity ?? ""}
                  onChange={(e) =>
                    updateTier(index, {
                      tier_min_quantity: numberOrUndefined(e.target.value),
                    })
                  }
                  disabled={disabled}
                  required
                />
                <Input
                  label="Cantidad máxima"
                  type="number"
                  min={0}
                  step="1"
                  value={tier.tier_max_quantity ?? ""}
                  onChange={(e) =>
                    updateTier(index, {
                      tier_max_quantity: numberOrUndefined(e.target.value),
                    })
                  }
                  disabled={disabled}
                  hint="Vacío = sin límite superior"
                />
                <Input
                  label="Descuento por unidad (%)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={tier.tier_discount_percentage ?? ""}
                  onChange={(e) =>
                    updateTier(index, {
                      tier_discount_percentage: numberOrUndefined(
                        e.target.value,
                      ),
                    })
                  }
                  disabled={disabled}
                  required
                  hint="Aplica a cada unidad del nivel"
                />
              </div>
            </div>
          ))}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addTier}
            >
              + Agregar nivel
            </Button>
          )}
        </div>
      );
    }

    case "combo":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Porcentaje sobre el total (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={rule.discount_percentage ?? ""}
            onChange={(e) =>
              set("discount_percentage", numberOrUndefined(e.target.value))
            }
            error={errors?.discount_percentage}
            disabled={disabled}
          />
          <Input
            label="Monto fijo del combo"
            type="number"
            min={0}
            step="0.01"
            value={rule.discount_amount ?? ""}
            onChange={(e) =>
              set("discount_amount", numberOrUndefined(e.target.value))
            }
            error={errors?.discount_amount}
            disabled={disabled}
          />
        </div>
      );

    default:
      return null;
  }
}
