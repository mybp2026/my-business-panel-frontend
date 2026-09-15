import { useState, useEffect, useRef, useCallback } from "react";
import { productApi } from "@/api/product.api";
import { warehouseApi } from "@/api/warehouse.api";
import type { Product } from "@/interfaces/entities/Product.interface";

type ProductVariantRow = Product & {
  variant_name?: string;
  product_variant_id?: string;
  unit_price?: number;
};

interface UseProductVariantSearchOptions {
  tenantId: string;
  warehouseId?: string;
  debounceMs?: number;
}

interface UseProductVariantSearchResult {
  variants: ProductVariantRow[];
  isLoading: boolean;
  search: (term: string) => Promise<void>;
  getStockForVariant: (variantId: string) => number | undefined;
}

/**
 * Custom hook para buscar product_variant con soporte de inventario (warehouse)
 * - Sin warehouseId: búsqueda de catálogo usando productApi.search()
 * - Con warehouseId: búsqueda de inventario con cálculo de stock agregado
 */
export function useProductVariantSearch({
  tenantId,
  warehouseId,
  debounceMs = 400,
}: UseProductVariantSearchOptions): UseProductVariantSearchResult {
  const [variants, setVariants] = useState<ProductVariantRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inventoryStockRef = useRef<Map<string, number>>(new Map());

  const fetchVariants = useCallback(
    async (term: string) => {
      if (!tenantId) {
        setVariants([]);
        return;
      }

      setIsLoading(true);
      try {
        if (warehouseId) {
          await fetchInventoryVariants(term);
        } else {
          await fetchCatalogVariants(term);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, warehouseId],
  );

  const fetchCatalogVariants = async (term: string) => {
    const data = await productApi.search(tenantId, term, 1, 100);
    setVariants((data?.products ?? []) as ProductVariantRow[]);
    inventoryStockRef.current.clear();
  };

  const fetchInventoryVariants = async (term: string) => {
    const inventory = await warehouseApi.listInventory(warehouseId!, term);
    const map = new Map<
      string,
      {
        stock: number;
        sku?: string;
        variant_name?: string;
        unit_price?: number;
        is_composite?: boolean;
      }
    >();

    // 1. Agregar cada producto del inventario
    for (const item of inventory ?? []) {
      const id = item.product_variant_id;
      const entry = map.get(id) ?? {
        stock: 0,
        sku: item.sku ?? undefined,
        variant_name: item.variant_name ?? item.product_name,
        unit_price: item.unit_price,
        is_composite: item.is_composite,
      };
      entry.stock += Number(item.stock ?? 0);
      if (item.unit_price !== undefined) entry.unit_price = item.unit_price;
      if (item.is_composite !== undefined) entry.is_composite = item.is_composite;
      map.set(id, entry);

      // 2. Si es compuesto, expandir children para stock virtual
      if (item.is_composite) {
        try {
          const compositions = await productApi.getComposition(tenantId, id);
          for (const comp of compositions) {
            const childId = comp.child_product_variant_id;
            const qtyPerParent = Number(comp.quantity ?? 0);
            const childStock = Number(item.stock ?? 0) * qtyPerParent;
            const existing = map.get(childId) ?? {
              stock: 0,
              sku: comp.child_sku ?? undefined,
              variant_name: comp.child_variant_name ?? undefined,
              unit_price: 0,
              is_composite: false, // children components are usually not composites themselves in this flattened view
            };
            existing.stock += childStock;
            if (!existing.sku && comp.child_sku) existing.sku = comp.child_sku;
            if (!existing.variant_name && comp.child_variant_name) {
              existing.variant_name = comp.child_variant_name;
            }
            map.set(childId, existing);
          }
        } catch {
          // ignorar errores de composición
        }
      }
    }

    // 3. Enriquecer precios faltantes
    const result: ProductVariantRow[] = [];
    const enrichPromises: Array<Promise<void>> = [];

    for (const [id, value] of map.entries()) {
      const row: ProductVariantRow = {
        product_id: id,
        product_name: value.variant_name ?? "",
        tenant_id: tenantId,
        created_at: "",
        updated_at: "",
        product_variant_id: id,
        variant_name: value.variant_name,
        sku: value.sku ?? "",
        unit_price: value.unit_price ?? 0,
        price: value.unit_price ?? 0,
        is_composite: value.is_composite,
      };
      result.push(row);
      inventoryStockRef.current.set(id, value.stock);

      if (!row.unit_price || row.unit_price === 0) {
        enrichPromises.push(
          (async () => {
            try {
              const product = await productApi.getByIdWithAttributes(
                tenantId,
                id,
              );
              if (product) {
                row.variant_name =
                  row.variant_name ??
                  product.variant_name ??
                  product.product_name;
                row.sku = row.sku ?? product.sku ?? undefined;
                row.unit_price = Number(
                  product.unit_price ?? product.price ?? 0,
                );
                row.is_composite = product.is_composite;
              }
            } catch {
              // ignorar errores de enriquecimiento
            }
          })(),
        );
      }
    }

    await Promise.all(enrichPromises);
    setVariants(result);
  };

  const search = useCallback(
    (term: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      return new Promise<void>((resolve) => {
        debounceRef.current = setTimeout(() => {
          fetchVariants(term.trim()).then(resolve);
        }, debounceMs);
      });
    },
    [fetchVariants, debounceMs],
  );

  const getStockForVariant = useCallback((variantId: string) => {
    return inventoryStockRef.current.get(variantId);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    variants,
    isLoading,
    search,
    getStockForVariant,
  };
}
