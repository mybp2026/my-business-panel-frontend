import { useEffect, useMemo, useState } from "react";

import { warehouseApi } from "@/api/warehouse.api";
import { productGroupApi } from "@/api/productGroup.api";
import { productCompositionApi } from "@/api/productComposition.api";
import { useDebounce } from "@/hooks/useDebounce";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

import type { Warehouse } from "@/interfaces/entities/Warehouse.interface";
import type { InventoryItem } from "@/interfaces/entities/InventoryItem.interface";
import type { InventoryTransferProductInput } from "@/interfaces/api/requests/CreateInventoryTransferRequest.interface";
import type { TenantProductGroup } from "@/interfaces/entities/ProductGroup.interface";
import type { CompositionComponent } from "@/interfaces/entities/ProductComposition.interface";

interface TransferModalProps {
  isOpen: boolean;
  warehouses: Warehouse[];
  tenantId: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    origin_warehouse_id: string;
    destination_warehouse_id: string;
    departure_date: string | null;
    arrival_date: string | null;
    products: InventoryTransferProductInput[];
  }) => Promise<void>;
}

interface DraftLine {
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  amount: number;
  available: number;
  from_composite_id?: string;
}

type DateMode = "now" | "custom";

interface DateField {
  mode: DateMode;
  value: string;
}

interface DisplayItemRow {
  type: "item";
  item: InventoryItem;
}

interface DisplayComponentRow {
  type: "component";
  component: CompositionComponent;
  parentId: string;
  desagrupado?: InventoryItem;
}

type DisplayRow = DisplayItemRow | DisplayComponentRow;

const nowIsoLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function TransferModal({
  isOpen,
  warehouses,
  tenantId,
  isSubmitting,
  onClose,
  onSubmit,
}: TransferModalProps) {
  const [originId, setOriginId] = useState<string>("");
  const [destinationId, setDestinationId] = useState<string>("");
  const [originInventory, setOriginInventory] = useState<InventoryItem[]>([]);
  const [destInventory, setDestInventory] = useState<InventoryItem[]>([]);
  const [draft, setDraft] = useState<Record<string, DraftLine>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [skuSearch, setSkuSearch] = useState("");
  const debouncedSkuSearch = useDebounce(skuSearch, 400);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [groups, setGroups] = useState<TenantProductGroup[]>([]);

  const [expandedLotes, setExpandedLotes] = useState<Set<string>>(new Set());
  const [compositionCache, setCompositionCache] = useState<
    Record<string, CompositionComponent[]>
  >({});
  const [loadingCompositions, setLoadingCompositions] = useState<Set<string>>(
    new Set(),
  );

  const [departure, setDeparture] = useState<DateField>({
    mode: "now",
    value: nowIsoLocal(),
  });
  const [arrival, setArrival] = useState<DateField>({
    mode: "now",
    value: nowIsoLocal(),
  });

  const reset = () => {
    setOriginId("");
    setDestinationId("");
    setOriginInventory([]);
    setDestInventory([]);
    setDraft({});
    setError(null);
    setSkuSearch("");
    setSelectedGroupId("");
    setExpandedLotes(new Set());
    setCompositionCache({});
    setLoadingCompositions(new Set());
    setDeparture({ mode: "now", value: nowIsoLocal() });
    setArrival({ mode: "now", value: nowIsoLocal() });
  };

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  useEffect(() => {
    if (!tenantId) return;
    productGroupApi.listByTenant(tenantId).then(setGroups).catch(() => {});
  }, [tenantId]);

  // Clear draft and expanded state when origin warehouse changes
  useEffect(() => {
    setDraft({});
    setExpandedLotes(new Set());
    setCompositionCache({});
  }, [originId]);

  useEffect(() => {
    if (!originId) {
      setOriginInventory([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    warehouseApi
      .listInventory(
        originId,
        debouncedSkuSearch || undefined,
        selectedGroupId || undefined,
      )
      .then((data) => {
        if (!cancelled) setOriginInventory(data);
      })
      .catch(() => {
        if (!cancelled) setOriginInventory([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [originId, debouncedSkuSearch, selectedGroupId]);

  useEffect(() => {
    if (!destinationId) {
      setDestInventory([]);
      return;
    }
    let cancelled = false;
    warehouseApi
      .listInventory(destinationId)
      .then((data) => {
        if (!cancelled) setDestInventory(data);
      })
      .catch(() => {
        if (!cancelled) setDestInventory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [destinationId]);

  const toggleLoteExpand = async (item: InventoryItem) => {
    const id = item.product_variant_id;
    const next = new Set(expandedLotes);

    if (next.has(id)) {
      next.delete(id);
      setExpandedLotes(next);
      return;
    }

    next.add(id);
    setExpandedLotes(next);

    if (!compositionCache[id] && tenantId) {
      setLoadingCompositions((prev) => new Set(prev).add(id));
      try {
        const comps = await productCompositionApi.byParent(tenantId, id);
        setCompositionCache((prev) => ({ ...prev, [id]: comps }));
      } catch {
        setCompositionCache((prev) => ({ ...prev, [id]: [] }));
      } finally {
        setLoadingCompositions((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      }
    }
  };

  const inventoryByVariantId = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of originInventory) {
      map.set(item.product_variant_id, item);
    }
    return map;
  }, [originInventory]);

  const displayRows = useMemo((): DisplayRow[] => {
    const claimedIds = new Set<string>();
    for (const loteId of expandedLotes) {
      const comps = compositionCache[loteId] ?? [];
      for (const c of comps) {
        claimedIds.add(c.child_product_variant_id);
      }
    }

    const rows: DisplayRow[] = [];
    for (const item of originInventory) {
      if (claimedIds.has(item.product_variant_id)) continue;
      rows.push({ type: "item", item });

      if (item.is_composite && expandedLotes.has(item.product_variant_id)) {
        const comps = compositionCache[item.product_variant_id] ?? [];
        for (const comp of comps) {
          rows.push({
            type: "component",
            component: comp,
            parentId: item.product_variant_id,
            desagrupado: inventoryByVariantId.get(
              comp.child_product_variant_id,
            ),
          });
        }
      }
    }
    return rows;
  }, [originInventory, expandedLotes, compositionCache, inventoryByVariantId]);

  const projectedDestination = useMemo(() => {
    const byVariant = new Map<string, InventoryItem & { _added?: number }>();
    destInventory.forEach((i) => byVariant.set(i.product_variant_id, { ...i }));
    Object.values(draft).forEach((line) => {
      const existing = byVariant.get(line.product_variant_id);
      if (existing) {
        existing.stock = existing.stock + line.amount;
      } else {
        byVariant.set(line.product_variant_id, {
          inventory_id: `pending-${line.product_variant_id}`,
          tenant_id: "",
          product_variant_id: line.product_variant_id,
          warehouse_id: destinationId,
          stock: line.amount,
          expiration_date: null,
          variant_name: line.variant_name,
          sku: line.sku,
          product_id: "",
          product_name: line.product_name,
          created_at: "",
        });
      }
    });
    return Array.from(byVariant.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name),
    );
  }, [destInventory, draft, destinationId]);

  const handleAmountChange = (item: InventoryItem, raw: string) => {
    const amount = Math.max(0, Math.floor(Number(raw) || 0));
    setDraft((prev) => {
      const next = { ...prev };
      if (amount === 0) {
        delete next[item.product_variant_id];
        return next;
      }
      next[item.product_variant_id] = {
        product_variant_id: item.product_variant_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        sku: item.sku,
        amount: Math.min(amount, item.stock),
        available: item.stock,
      };
      return next;
    });
  };

  const handleComponentAmountChange = (
    comp: CompositionComponent,
    desagrupado: InventoryItem | undefined,
    parentItem: InventoryItem,
    raw: string,
  ) => {
    const amount = Math.max(0, Math.floor(Number(raw) || 0));
    const id = comp.child_product_variant_id;

    setDraft((prev) => {
      const next = { ...prev };
      if (amount === 0) {
        delete next[id];
        return next;
      }
      const desagregadoStock = desagrupado?.stock ?? 0;
      const maxFromComposite = parentItem.stock * Number(comp.quantity);
      const maxTotal = desagregadoStock + maxFromComposite;
      const clamped = Math.min(amount, maxTotal);

      next[id] = {
        product_variant_id: id,
        product_name: comp.child_variant_name ?? "",
        variant_name: comp.child_variant_name ?? "",
        sku: comp.child_sku ?? null,
        amount: clamped,
        available: maxTotal,
        from_composite_id: parentItem.product_variant_id,
      };
      return next;
    });
  };

  const resolveDate = (field: DateField): string | null => {
    if (field.mode === "now") return new Date().toISOString();
    return field.value ? new Date(field.value).toISOString() : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!originId || !destinationId) {
      setError("Selecciona ambos almacenes");
      return;
    }
    if (originId === destinationId) {
      setError("El almacén de origen y destino deben ser distintos");
      return;
    }
    const products = Object.values(draft);
    if (products.length === 0) {
      setError("Agrega al menos un producto a la transferencia");
      return;
    }

    await onSubmit({
      origin_warehouse_id: originId,
      destination_warehouse_id: destinationId,
      departure_date: resolveDate(departure),
      arrival_date: resolveDate(arrival),
      products: products.map((p) => ({
        product_id: p.product_variant_id,
        amount: p.amount,
        from_composite_id: p.from_composite_id,
      })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva transferencia de inventario"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Select
            label="Origen"
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            options={warehouses
              .filter((w) => w.warehouse_id !== destinationId)
              .map((w) => ({
                value: w.warehouse_id,
                label: `${w.warehouse_name}${w.is_branch ? " (piso de venta)" : ""}`,
              }))}
            placeholder="Almacén de origen"
            required
          />
          <Select
            label="Destino"
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            options={warehouses
              .filter((w) => w.warehouse_id !== originId)
              .map((w) => ({
                value: w.warehouse_id,
                label: `${w.warehouse_name}${w.is_branch ? " (piso de venta)" : ""}`,
              }))}
            placeholder="Almacén de destino"
            required
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DateFieldInput
            label="Fecha de salida"
            field={departure}
            onChange={setDeparture}
          />
          <DateFieldInput
            label="Fecha de llegada"
            field={arrival}
            onChange={setArrival}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Inventario origen
              </p>
            </div>

            {originId && (
              <div className="px-3 py-2 border-b border-gray-100 flex gap-2">
                <Input
                  placeholder="Buscar SKU o nombre..."
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  className="flex-1 text-xs"
                />
                {groups.length > 0 && (
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-accent-500 shrink-0"
                  >
                    <option value="">Todos</option>
                    {groups.map((g) => (
                      <option
                        key={g.tenant_product_group_id}
                        value={g.tenant_product_group_id}
                      >
                        {g.group_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {isLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
                </div>
              )}
              {!isLoading && originInventory.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">
                  {originId
                    ? "Sin productos en el almacén de origen"
                    : "Selecciona un almacén de origen"}
                </p>
              )}
              {!isLoading &&
                displayRows.map((row, idx) => {
                  if (row.type === "item") {
                    const { item } = row;
                    const value = draft[item.product_variant_id]?.amount ?? 0;
                    const isExpanded = expandedLotes.has(
                      item.product_variant_id,
                    );
                    const isLoadingComp = loadingCompositions.has(
                      item.product_variant_id,
                    );

                    return (
                      <div
                        key={item.inventory_id}
                        className="px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.product_name} — {item.variant_name}
                            </p>
                            {item.is_composite && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                                Lote
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            SKU {item.sku ?? "—"} · stock{" "}
                            <span className="font-mono">{item.stock}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            type="number"
                            min={0}
                            max={item.stock}
                            value={value === 0 ? "" : String(value)}
                            onChange={(e) =>
                              handleAmountChange(item, e.target.value)
                            }
                            placeholder="0"
                            className="w-20 text-right"
                          />
                          {item.is_composite && (
                            <button
                              type="button"
                              onClick={() => toggleLoteExpand(item)}
                              disabled={isLoadingComp}
                              className="p-1 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                              title={
                                isExpanded
                                  ? "Colapsar"
                                  : "Ver componentes del lote"
                              }
                            >
                              {isLoadingComp ? (
                                <div className="w-4 h-4 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
                              ) : (
                                <svg
                                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const { component, parentId, desagrupado } = row;
                  const parentItem = inventoryByVariantId.get(parentId);
                  const compValue =
                    draft[component.child_product_variant_id]?.amount ?? 0;
                  const desagregadoStock = desagrupado?.stock ?? 0;
                  const maxFromComposite =
                    (parentItem?.stock ?? 0) * Number(component.quantity);
                  const maxTotal = desagregadoStock + maxFromComposite;

                  return (
                    <div
                      key={`${idx}-comp-${component.child_product_variant_id}`}
                      className="pl-8 pr-4 py-2.5 flex items-center justify-between gap-3 border-l-2 border-purple-200 bg-purple-50/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {component.child_variant_name ??
                            component.child_product_variant_id}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          SKU {component.child_sku ?? "—"}
                          {desagregadoStock > 0 ? (
                            <span className="ml-2 text-purple-700 font-medium">
                              · {desagregadoStock} desagrupados
                            </span>
                          ) : (
                            <span className="ml-2 text-gray-400">· en lote</span>
                          )}
                          {maxTotal > 0 && (
                            <span className="ml-1 text-gray-400">
                              ({maxTotal} disponibles)
                            </span>
                          )}
                        </p>
                      </div>
                      {maxTotal > 0 && parentItem ? (
                        <Input
                          type="number"
                          min={0}
                          max={maxTotal}
                          value={compValue === 0 ? "" : String(compValue)}
                          onChange={(e) =>
                            handleComponentAmountChange(
                              component,
                              desagrupado,
                              parentItem,
                              e.target.value,
                            )
                          }
                          placeholder="0"
                          className="w-20 text-right shrink-0"
                        />
                      ) : (
                        <span className="text-xs text-gray-400 w-20 text-right shrink-0">
                          Sin stock
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 bg-emerald-50 rounded-t-xl">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Inventario destino (proyección)
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {projectedDestination.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">
                  {destinationId
                    ? "El almacén destino aún no tendrá productos"
                    : "Selecciona un almacén de destino"}
                </p>
              )}
              {projectedDestination.map((item) => {
                const draftLine = draft[item.product_variant_id];
                return (
                  <div
                    key={item.product_variant_id}
                    className={[
                      "px-4 py-3 flex items-center justify-between gap-3",
                      draftLine ? "bg-emerald-50/50" : "",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product_name} — {item.variant_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        SKU {item.sku ?? "—"}
                        {draftLine ? ` · +${draftLine.amount} entrante` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-sm">{item.stock}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={Object.keys(draft).length === 0}
          >
            Realizar transferencia
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface DateFieldInputProps {
  label: string;
  field: DateField;
  onChange: (f: DateField) => void;
}

function DateFieldInput({ label, field, onChange }: DateFieldInputProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...field, mode: "now" })}
          className={[
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            field.mode === "now"
              ? "bg-accent-500 text-white border-accent-500"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50",
          ].join(" ")}
        >
          Ahora
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...field, mode: "custom" })}
          className={[
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            field.mode === "custom"
              ? "bg-accent-500 text-white border-accent-500"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50",
          ].join(" ")}
        >
          Personalizada
        </button>
      </div>
      {field.mode === "custom" && (
        <input
          type="datetime-local"
          value={field.value}
          onChange={(e) => onChange({ ...field, value: e.target.value })}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-accent-500"
        />
      )}
      {field.mode === "now" && (
        <p className="text-xs text-gray-400">
          Se registrará con la fecha y hora actual al confirmar
        </p>
      )}
    </div>
  );
}
