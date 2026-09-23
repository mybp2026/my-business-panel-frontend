import { useState, useEffect, useRef, useCallback } from "react";
import { useProductVariantSearch } from "@/hooks/useProductVariantSearch";
import { productApi } from "@/api/product.api";
import type { Product } from "@/interfaces/entities/Product.interface";

export interface ProductVariantSelection {
  product_variant_id: string;
  variant_name: string;
  sku?: string;
  unit_price: number;
  group_ids?: string[];
  includes_iva?: boolean;
}

interface ProductVariantComboBoxProps {
  tenantId: string;
  value: string;
  warehouseId?: string;
  manualSkuEnabled?: boolean;
  displayValue?: string;
  onChange: (selection: ProductVariantSelection) => void;
  onClear?: () => void;
  error?: string;
  required?: boolean;
  label?: string;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
  hideOutOfStock?: boolean;
}

type ProductVariantRow = Product & {
  variant_name?: string;
  product_variant_id?: string;
  unit_price?: number;
};

// ─── Utilities ─────────────────────────────────────────────────────────────

const getVariantId = (p: ProductVariantRow): string | undefined =>
  p.product_variant_id ?? p.product_id;

const getVariantName = (p: ProductVariantRow): string =>
  p.variant_name ?? p.product_name ?? "—";

const getVariantPrice = (p: ProductVariantRow): number =>
  Number(p.unit_price ?? p.price ?? 0);

const formatCurrency = (value: number): string =>
  value.toLocaleString("es-CR", { minimumFractionDigits: 2 });

export function ProductVariantComboBox({
  tenantId,
  value,
  warehouseId,
  manualSkuEnabled = false,
  displayValue,
  onChange,
  onClear,
  error,
  required,
  label,
  disabled,
  hint,
  placeholder = "Buscar producto por SKU o nombre...",
  hideOutOfStock = false,
}: ProductVariantComboBoxProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLabel, setSelectedLabel] = useState(displayValue || "");

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Custom hook for search logic
  const { variants, isLoading, error: searchError, search, getStockForVariant } =
    useProductVariantSearch({
      tenantId,
      warehouseId,
    });

  // Sync display value from parent
  useEffect(() => {
    setSelectedLabel(displayValue || "");
  }, [displayValue]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Event handlers
  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearchTerm("");
    search("").catch(console.error);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [disabled, search]);

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      search(term).catch(console.error);
    },
    [search],
  );

  const handleSelect = useCallback(
    (variant: ProductVariantRow) => {
      const id = getVariantId(variant);
      if (!id) return;

      const name = getVariantName(variant);
      let label = variant.sku ? `${name} (${variant.sku})` : name;

      // Show stock if available (warehouse search mode)
      const stock = getStockForVariant(id);
      if (stock !== undefined) {
        label = `${label} — disponible ${stock}`;
      }

      onChange({
        product_variant_id: id,
        variant_name: name,
        sku: variant.sku,
        unit_price: getVariantPrice(variant),
      });

      setSelectedLabel(label);
      setIsOpen(false);
      setSearchTerm("");
    },
    [onChange, getStockForVariant],
  );

  const handleManualSkuLookup = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || !manualSkuEnabled || !searchTerm.trim()) return;

      e.preventDefault();
      try {
        const found = await productApi.getBySku(searchTerm.trim());
        if (found?.product_variant_id) {
          const variant: ProductVariantRow = {
            ...found,
            product_variant_id: found.product_variant_id,
            variant_name: found.variant_name ?? found.product_name,
            unit_price: found.unit_price ?? found.price ?? 0,
          };
          handleSelect(variant);
        }
      } catch {
        // ignore errors
      }
    },
    [manualSkuEnabled, searchTerm, handleSelect],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear?.();
      setSelectedLabel("");
    },
    [onClear],
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={[
            "w-full rounded-lg border bg-white px-3 py-2 text-left text-sm transition-colors",
            "focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500",
            error ? "border-red-300 bg-red-50" : "border-gray-300",
            disabled
              ? "cursor-not-allowed bg-gray-50 opacity-50"
              : "cursor-pointer hover:border-gray-400",
            value ? "text-gray-900" : "text-gray-400",
          ].join(" ")}
        >
          <span className="block truncate pr-14">
            {value && selectedLabel ? selectedLabel : placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-gray-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {/* Clear Button */}
        {value && !disabled && onClear && (
          <button
            type="button"
            aria-label="limpiar selección"
            onClick={handleClear}
            className="absolute inset-y-0 right-7 flex items-center px-1 text-gray-400 transition-colors hover:text-gray-600"
            tabIndex={-1}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Search Header */}
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Ingrese SKU o nombre..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleManualSkuLookup}
                className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {isLoading
                ? "Buscando..."
                : `${variants.length} resultado${variants.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Results List */}
          <ul className="max-h-80 overflow-y-auto">
            {isLoading && (
              <li className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-200 border-t-accent-500" />
              </li>
            )}

            {!isLoading && searchError && (
              <li className="px-4 py-4 text-center text-sm text-red-600">
                {searchError}
              </li>
            )}

            {!isLoading && !searchError && variants.length === 0 && (
              <li className="px-4 py-4 text-center text-sm text-gray-500">
                {searchTerm.trim()
                  ? `Sin resultados para "${searchTerm.trim()}"`
                  : "No hay productos para mostrar"}
              </li>
            )}

            {!isLoading &&
              !searchError &&
              variants
                .filter((v) => {
                  if (!hideOutOfStock || !warehouseId) return true;
                  const id = getVariantId(v);
                  if (!id) return true;
                  const stock = getStockForVariant(id);
                  return (stock ?? 0) > 0;
                })
                .map((variant) => {
                  const id = getVariantId(variant);
                  const isSelected = !!id && id === value;

                return (
                  <li key={id ?? `${variant.sku}-${variant.product_name}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(variant)}
                      className={[
                        "w-full px-4 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-accent-50 font-medium text-accent-700"
                          : "text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex flex-1 items-center gap-2 truncate">
                          <span className="truncate">
                            {getVariantName(variant)}
                          </span>
                          {variant.is_composite && (
                            <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-700">
                              Lote
                            </span>
                          )}
                        </span>
                        <span className="whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                          {variant.sku ?? "—"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        Precio (USD):{" "}
                        <span className="font-mono">
                          ${formatCurrency(getVariantPrice(variant))}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {/* Helper Text */}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
