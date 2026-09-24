import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { ProductVariantComboBox } from "@/components/ui/ProductVariantComboBox";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";
import { IconPlus, IconTrash, IconX } from "@/assets/icons";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";

import { formatAmount, TAX_RATE, buildVariantLabel } from "../../create-sale.constants";
import type { CartItem } from "../../create-sale.types";
import { RoyaltyPanel } from "../../RoyaltyPanel";
import type { ItemsSectionProps } from "./ItemsSectionProps";

export function ItemsSection({
  step,
  tenantId,
  branchWarehouseId,
  itemForm,
  selectedVariant,
  onVariantSelect,
  onVariantClear,
  onAddItem,
  saleCondition,
  onSaleConditionChange,
  conditionOptions,
  items,
  lastItemAmount,
  onOpenPromotionModal,
  appliedPromotion,
  onRemovePromotion,
  calc,
  effectiveExchangeRate,
  customer,
  isWalkInSale,
  onAddRoyaltyItems,
  onQuantityChange,
  onRemoveItem,
}: ItemsSectionProps) {
  const {
    defaultPromoDiscount,
    hasNonStackableDefault,
    grossSubtotal,
    discountAmount,
    subtotal,
    totalAmount,
    currencySymbol,
    convertCrcToSaleCurrency,
    discountAmountDisplay,
    grossSubtotalInDollars,
    discountAmountInDollars,
    subtotalInDollars,
    totalInDollars,
  } = calc;

  const itemColumns: Column[] = [
    { key: "variant_name", label: "Producto", width: "40%" },
    { key: "sku", label: "SKU", width: "15%", render: (v) => v ?? "—" },
    {
      key: "quantity",
      label: "Cant.",
      width: "10%",
      render: (_: number, row: CartItem) => (
        <input
          aria-label="cantidad"
          type="number"
          min={1}
          value={row.quantity}
          onChange={(e) =>
            onQuantityChange(row.id, parseInt(e.target.value, 10) || 1)
          }
          className="w-16 rounded border border-gray-300 px-2 py-1 text-center font-mono text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      ),
    },
    {
      key: "unit_price",
      label: "Precio",
      width: "15%",
      render: (_: number, row: CartItem) => (
        <DualCurrencyAmount amountBs={row.unit_price} rate={effectiveExchangeRate} />
      ),
    },
    {
      key: "total_price",
      label: "Subtotal",
      width: "15%",
      render: (_: number, row: CartItem) => (
        <DualCurrencyAmount amountBs={row.total_price} rate={effectiveExchangeRate} bold />
      ),
    },
    {
      key: "actions",
      label: "",
      width: "5%",
      render: (_: unknown, row: CartItem) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => onRemoveItem(row.id)}
          title="Quitar"
        >
          <IconTrash />
        </Button>
      ),
    },
  ];

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-300 p-6 mb-6 ${
        step === "items" ? "" : "opacity-60 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Productos y servicios
        </h2>
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <form
          onSubmit={itemForm.handleSubmit(onAddItem)}
          className="flex-1 grid grid-cols-1 md:grid-cols-9 gap-3"
        >
          <div className="md:col-span-6">
            <ProductVariantComboBox
              tenantId={tenantId}
              warehouseId={branchWarehouseId}
              manualSkuEnabled
              label="Producto"
              value={itemForm.watch("product_variant_id")}
              displayValue={
                selectedVariant ? buildVariantLabel(selectedVariant) : ""
              }
              onChange={onVariantSelect}
              onClear={onVariantClear}
              error={itemForm.formState.errors.product_variant_id?.message}
              hideOutOfStock={true}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Cantidad"
              type="number"
              min={1}
              {...itemForm.register("quantity", { valueAsNumber: true })}
              error={itemForm.formState.errors.quantity?.message}
              required
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button type="submit" variant="primary" fullWidth>
              <IconPlus />
            </Button>
          </div>
        </form>
        <div className="w-full md:w-52 shrink-0">
          <Select
            label="Condición de venta"
            value={saleCondition}
            onChange={(e) => onSaleConditionChange(e.target.value)}
            options={conditionOptions}
            required
          />
        </div>
        <div className="flex items-end shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onOpenPromotionModal}
            disabled={items.length === 0 || hasNonStackableDefault}
            title={
              hasNonStackableDefault
                ? "Hay una promoción default activa que no permite acumular más"
                : "Agregar promoción"
            }
          >
            PROMO
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">
          {items.length > 0 && (
            <span>
              Último producto agregado:{" "}
              <span className="font-semibold text-gray-900">
                {formatAmount(
                  convertCrcToSaleCurrency(lastItemAmount),
                  currencySymbol,
                )}
              </span>
            </span>
          )}
        </div>
      </div>

      {hasNonStackableDefault && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Una promoción default activa no permite acumular promociones
          adicionales. No es posible agregar otra encima.
        </div>
      )}

      {defaultPromoDiscount.total > 0 && defaultPromoDiscount.source && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Promoción default aplicada
          </p>
          <p className="mt-1 text-sm font-medium text-blue-900">
            {defaultPromoDiscount.source.promotion_name}
            <span className="ml-2 text-xs font-normal text-blue-700">
              Descuento: -
              {formatAmount(defaultPromoDiscount.total, currencySymbol)}
            </span>
          </p>
        </div>
      )}

      {appliedPromotion && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Promoción aplicada
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-900 truncate">
              {appliedPromotion.description}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Descuento total:{" "}
              <span className="font-semibold">
                -{formatAmount(discountAmountDisplay, currencySymbol)}
              </span>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemovePromotion}
            title="Quitar promoción"
          >
            <IconX />
          </Button>
        </div>
      )}

      <div className="mt-4">
        <RoyaltyPanel
          customer={isWalkInSale ? null : customer}
          tenantId={tenantId}
          totalAmount={totalAmount}
          onAddItems={onAddRoyaltyItems}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Subtotal bruto
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {grossSubtotalInDollars !== null
              ? formatAmount(grossSubtotalInDollars, "$")
              : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {grossSubtotalInDollars !== null
              ? `≈ ${formatAmount(grossSubtotal, "Bs.")}`
              : "Configure una tasa para ver el equivalente."}
          </p>
        </div>
        <div
          className={`border rounded-xl p-4 ${
            discountAmount > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p
            className={`text-xs uppercase tracking-wider ${
              discountAmount > 0 ? "text-amber-700" : "text-gray-500"
            }`}
          >
            Descuento
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${
              discountAmount > 0 ? "text-amber-900" : "text-gray-900"
            }`}
          >
            -
            {discountAmountInDollars !== null
              ? formatAmount(discountAmountInDollars, "$")
              : "—"}
          </p>
          <p
            className={`text-xs mt-1 ${
              discountAmount > 0 ? "text-amber-700" : "text-gray-500"
            }`}
          >
            {discountAmountInDollars !== null
              ? `≈ -${formatAmount(discountAmount, "Bs.")}`
              : "Configure una tasa para ver el equivalente."}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Subtotal con descuento
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {subtotalInDollars !== null
              ? formatAmount(subtotalInDollars, "$")
              : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {subtotalInDollars !== null
              ? `≈ ${formatAmount(subtotal, "Bs.")}`
              : "Configure una tasa para ver el equivalente."}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-700">
            Total con IVA ({(TAX_RATE * 100).toFixed(0)}%)
          </p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {totalInDollars !== null
              ? formatAmount(totalInDollars, "$")
              : "—"}
          </p>
          {totalInDollars !== null && (
            <p className="text-xs text-emerald-700 mt-1">
              ≈ {formatAmount(totalAmount, "Bs.")} ·
              <span className="ml-1 text-emerald-600">
                tasa{" "}
                {effectiveExchangeRate.toLocaleString("es-CR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </span>
            </p>
          )}
          {totalInDollars === null && (
            <p className="text-xs text-amber-700 mt-1">
              Configure una tasa para ver el equivalente en bolívares.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Table
          columns={itemColumns}
          data={items}
          emptyMessage="Aún no hay productos en la venta"
        />
      </div>
    </div>
  );
}
