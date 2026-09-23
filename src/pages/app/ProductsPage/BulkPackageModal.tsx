import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { GroupAssignmentEditor } from "@/components/ui/GroupAssignmentEditor";
import {
  AttributeAssignmentEditor,
  type AttributeAssignmentRow,
} from "@/components/ui/AttributeAssignmentEditor";

import { productApi, type BulkProductInput } from "@/api/product.api";
import type { UpdateProductRequest } from "@/interfaces/api/requests/UpdateProductRequest.interface";
import { productCompositionApi } from "@/api/productComposition.api";
import { purchaseApi } from "@/api/purchase.api";
import type { Supplier } from "@/interfaces/entities/Purchase.interface";

interface BulkPackageModalProps {
  isOpen: boolean;
  tenantId: string;
  /** "create" (default) opens an empty form; "edit" pre-fills from editingProductId. */
  mode?: "create" | "edit";
  /** Required when mode === "edit". The parent (lote) product_variant_id. */
  editingProductId?: string;
  onClose: () => void;
  onOptimisticCreate: (product: {
    tempId: string;
    sku: string;
    product_name: string;
    price: number;
    cost_price: number;
    supplier_id?: string;
    tenant_id: string;
  }) => void;
  onConfirmCreate: (tempId: string, createdParentId: string) => void;
  onRollbackCreate: (tempId: string) => void;
  /** Fired when an edit submit succeeds. Receives the parent variant id. */
  onEditSuccess?: (parentVariantId: string) => void;
}

interface ParentForm {
  sku: string;
  name: string;
  supplier_id: string;
}

interface ComponentForm {
  /** Local UI key — not sent to the backend. */
  key: string;
  /** Existing child product_variant_id. Present only for edit-mode rows. */
  existingId?: string;
  sku: string;
  name: string;
  unit_price: string;
  cost_price: string;
  /** How many child units make up one parent unit (e.g. 6 for a six-pack). */
  quantity_per_parent: string;
  attributes: AttributeAssignmentRow[];
}

const EMPTY_PARENT: ParentForm = {
  sku: "",
  name: "",
  supplier_id: "",
};

const newComponent = (
  parentSku?: string,
  initialAttributes: AttributeAssignmentRow[] = [],
): ComponentForm => ({
  key: `c-${crypto.randomUUID()}`,
  sku: parentSku ? `${parentSku}-` : "",
  name: "",
  unit_price: "0",
  cost_price: "0",
  quantity_per_parent: "1",
  attributes: [...initialAttributes],
});

const MIN_COMPONENTS = 1;
const MAX_COMPONENTS = 50;

export function BulkPackageModal({
  isOpen,
  tenantId,
  mode = "create",
  editingProductId,
  onClose,
  onOptimisticCreate,
  onConfirmCreate,
  onRollbackCreate,
  onEditSuccess,
}: BulkPackageModalProps) {
  const isEdit = mode === "edit";
  const [parent, setParent] = useState<ParentForm>(EMPTY_PARENT);
  const [parentGroupIds, setParentGroupIds] = useState<string[]>([]);
  const [parentAttributes, setParentAttributes] = useState<AttributeAssignmentRow[]>(
    [],
  );
  const [useParentSkuAsPrefix, setUseParentSkuAsPrefix] = useState(true);
  const [componentCount, setComponentCount] = useState(0);
  const [components, setComponents] = useState<ComponentForm[]>([
    newComponent(),
  ]);
  const [isGiftable, setIsGiftable] = useState(false);
  const [isIncludesIva, setIsIncludesIva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  // In edit mode each child has its own price/cost loaded from DB, so we
  // default to non-uniform. The user can still flip the switch.
  const [useUniformPricing, setUseUniformPricing] = useState(!isEdit);
  const [uniformPrice, setUniformPrice] = useState("");
  const [uniformCost, setUniformCost] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Synchronize parent attributes to all components in real-time
  useEffect(() => {
    setComponents((prev) =>
      prev.map((c) => {
        // Filter out child attributes that are already defined in the parent to avoid duplicates/conflicts
        const specificAttributes = c.attributes.filter(
          (childAttr) =>
            !parentAttributes.some(
              (pAttr) =>
                pAttr.tenant_attribute_id === childAttr.tenant_attribute_id &&
                pAttr.tenant_attribute_id !== "",
            ),
        );

        return {
          ...c,
          attributes: [...parentAttributes, ...specificAttributes],
        };
      }),
    );
  }, [parentAttributes]);

  const reset = () => {
    setParent(EMPTY_PARENT);
    setParentGroupIds([]);
    setParentAttributes([]);
    setUseParentSkuAsPrefix(true);
    setComponentCount(1);
    setComponents([newComponent()]);
    setIsGiftable(false);
    setIsIncludesIva(false);
    setError(null);
    setSubmitting(false);
    setUseUniformPricing(true);
    setUniformPrice("");
    setUniformCost("");
  };

  useEffect(() => {
    if (!isOpen) return;
    purchaseApi
      .listSuppliers()
      .then(setSuppliers)
      .catch(() => {});
  }, [isOpen]);

  // Edit mode: load parent + composition + each child in parallel and prefill.
  useEffect(() => {
    if (!isOpen || !isEdit || !editingProductId || !tenantId) return;
    let cancelled = false;
    setLoadingEdit(true);
    setError(null);

    (async () => {
      try {
        const [parentData, comps] = await Promise.all([
          productApi.getByIdWithAttributes(tenantId, editingProductId),
          productCompositionApi.byParent(tenantId, editingProductId),
        ]);
        if (cancelled) return;

        setParent({
          sku: parentData.sku ?? "",
          name:
            (parentData as { variant_name?: string }).variant_name ??
            parentData.product_name ??
            "",
          supplier_id: parentData.supplier_id ?? "",
        });
        setParentGroupIds(
          parentData.groups?.map((g) => g.tenant_product_group_id) ?? [],
        );
        setParentAttributes(
          parentData.attributes?.map((a) => ({
            tenant_attribute_id: a.tenant_attribute_id,
            attribute_name: a.attribute_name,
            selected_value_ids: [a.attribute_value_id],
          })) ?? [],
        );
        setIsGiftable(
          (parentData as { giftable?: boolean }).giftable ?? false,
        );
        setIsIncludesIva(
          (parentData as { includes_iva?: boolean }).includes_iva ?? false,
        );
        setUseParentSkuAsPrefix(false);

        const childDetails = await Promise.all(
          comps.map((c) =>
            productApi
              .getByIdWithAttributes(tenantId, c.child_product_variant_id)
              .catch(() => null),
          ),
        );
        if (cancelled) return;

        const toStr = (v: unknown): string => {
          if (v === null || v === undefined || v === "") return "0";
          const n = Number(v);
          return Number.isFinite(n) ? String(n) : "0";
        };
        const rows: ComponentForm[] = comps.map((c, i) => {
          const child = childDetails[i] as
            | (Record<string, unknown> & {
                attributes?: Array<{
                  attribute_value_id: string;
                  tenant_attribute_id: string;
                  attribute_name: string;
                }>;
              })
            | null;
          return {
            key: `c-${c.child_product_variant_id}`,
            existingId: c.child_product_variant_id,
            sku: (child?.sku as string | undefined) ?? c.child_sku ?? "",
            name:
              (child?.variant_name as string | undefined) ??
              c.child_variant_name ??
              "",
            unit_price: toStr(child?.unit_price),
            cost_price: toStr(child?.cost_price),
            quantity_per_parent: toStr(c.quantity) || "1",
            attributes:
              child?.attributes?.map((a) => ({
                tenant_attribute_id: a.tenant_attribute_id,
                attribute_name: a.attribute_name,
                selected_value_ids: [a.attribute_value_id],
              })) ?? [],
          };
        });
        setComponents(rows);
        setComponentCount(rows.length);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Error al cargar el lote",
          );
        }
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isEdit, editingProductId, tenantId]);

  // Sync components array length to componentCount.
  useEffect(() => {
    setComponents((prev) => {
      if (componentCount > prev.length) {
        const additions = Array.from(
          { length: componentCount - prev.length },
          () =>
            newComponent(useParentSkuAsPrefix ? parent.sku.trim() : undefined),
        );
        return [...prev, ...additions];
      }
      if (componentCount < prev.length) {
        return prev.slice(0, componentCount);
      }
      return prev;
    });
  }, [componentCount, useParentSkuAsPrefix, parent.sku]);

  // Sync parent SKU prefix to existing components when checkbox changes.
  // Skipped entirely in edit mode — SKUs are already valid and we don't want
  // the auto-prefix logic to clobber them.
  useEffect(() => {
    if (isEdit) return;
    if (componentCount === 0) return;
    setComponents((prev) =>
      prev.map((c) => {
        if (useParentSkuAsPrefix && parent.sku.trim()) {
          const parentSkuPrefix = parent.sku.trim();
          // If the component SKU doesn't start with the parent prefix, update it
          if (!c.sku.startsWith(parentSkuPrefix)) {
            return { ...c, sku: `${parentSkuPrefix}-` };
          }
        } else if (
          !useParentSkuAsPrefix &&
          c.sku.startsWith(parent.sku.trim())
        ) {
          // When disabling prefix, clear SKUs that start with the parent SKU
          return { ...c, sku: "" };
        }
        return c;
      }),
    );
  }, [useParentSkuAsPrefix, parent.sku]);

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const updateComponent = (key: string, patch: Partial<ComponentForm>) => {
    setComponents((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    );
  };

  const handleCountChange = (raw: string) => {
    if (raw === "") {
      setComponentCount(0);
    } else {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) {
        setComponentCount(n);
        setComponents((prev) => {
          if (n > prev.length) {
            const extra = Array.from({ length: n - prev.length }, () =>
              newComponent(
                useParentSkuAsPrefix ? parent.sku : undefined,
                parentAttributes,
              ),
            );
            return [...prev, ...extra];
          }
          return prev.slice(0, n);
        });
      }
    }
  };

  const handleCountBlur = () => {
    setComponentCount((c) => {
      if (c === 0) return MIN_COMPONENTS;
      return Math.min(c, MAX_COMPONENTS);
    });
  };

  const validate = (): string | null => {
    if (!tenantId) return "No se identificó el tenant";
    if (!parent.sku.trim()) return "El SKU del lote es obligatorio";
    if (!parent.name.trim()) return "El nombre del lote es obligatorio";
    if (components.length === 0) {
      return "Agrega al menos un componente";
    }
    if (parentGroupIds.length === 0) {
      return "Asigna al menos una familia o dimensión al lote";
    }

    if (useUniformPricing) {
      const price = parseFloat(uniformPrice);
      if (!Number.isFinite(price) || price < 0)
        return "Ingresa un precio unitario válido para todos los componentes";
      const cost = parseFloat(uniformCost);
      if (!Number.isFinite(cost) || cost < 0)
        return "Ingresa un costo unitario válido para todos los componentes";
    }

    const seenSkus = new Set<string>();
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const label = `Componente #${i + 1}`;
      if (!c.sku.trim()) return `${label}: SKU es obligatorio`;
      const sku = c.sku.trim().toUpperCase();
      if (seenSkus.has(sku))
        return `${label}: SKU duplicado entre componentes (${sku})`;
      seenSkus.add(sku);
      if (!c.name.trim()) return `${label}: nombre es obligatorio`;

      if (!useUniformPricing) {
        const price = parseFloat(c.unit_price);
        if (!Number.isFinite(price) || price < 0)
          return `${label}: precio unitario inválido`;
        const cost = parseFloat(c.cost_price);
        if (!Number.isFinite(cost) || cost < 0)
          return `${label}: costo unitario inválido`;
      }

      const qty = parseFloat(c.quantity_per_parent);
      if (!Number.isFinite(qty) || qty <= 0)
        return `${label}: la cantidad por lote debe ser > 0`;
    }
    return null;
  };

  const buildChildPayload = (c: ComponentForm): BulkProductInput => {
    const unitPrice = useUniformPricing
      ? parseFloat(uniformPrice) || 0
      : parseFloat(c.unit_price) || 0;
    const costPrice = useUniformPricing
      ? parseFloat(uniformCost) || 0
      : parseFloat(c.cost_price) || 0;
    return {
      tenant_id: tenantId,
      sku: c.sku.trim().toUpperCase(),
      variant_name: c.name.trim(),
      unit_price: unitPrice,
      cost_price: costPrice,
      attribute_value_ids: c.attributes.flatMap((r) => r.selected_value_ids),
      group_ids: parentGroupIds.length ? parentGroupIds : undefined,
      supplier_id: parent.supplier_id || undefined,
      giftable: isGiftable,
      includes_iva: isIncludesIva,
    };
  };

  const handleEditSubmit = async () => {
    if (!editingProductId) return;

    const parentTotalPrice = components.reduce((acc, c) => {
      const price = useUniformPricing
        ? parseFloat(uniformPrice) || 0
        : parseFloat(c.unit_price) || 0;
      return acc + price * (parseFloat(c.quantity_per_parent) || 0);
    }, 0);
    const parentTotalCost = components.reduce((acc, c) => {
      const cost = useUniformPricing
        ? parseFloat(uniformCost) || 0
        : parseFloat(c.cost_price) || 0;
      return acc + cost * (parseFloat(c.quantity_per_parent) || 0);
    }, 0);

    const parentUpdate: UpdateProductRequest = {
      sku: parent.sku.trim().toUpperCase(),
      variant_name: parent.name.trim(),
      product_name: parent.name.trim(),
      unit_price: Number(parentTotalPrice.toFixed(2)),
      cost_price: Number(parentTotalCost.toFixed(2)),
      supplier_id: parent.supplier_id || null,
      giftable: isGiftable,
      includes_iva: isIncludesIva,
      group_ids: parentGroupIds,
      attribute_value_ids: parentAttributes.flatMap((r) => r.selected_value_ids),
    };

    await productApi.update(editingProductId, parentUpdate);

    const existingRows = components.filter((c) => c.existingId);
    const newRows = components.filter((c) => !c.existingId);

    await Promise.all(
      existingRows.map((c) => {
        const payload = buildChildPayload(c);
        const update: UpdateProductRequest = {
          sku: payload.sku,
          variant_name: payload.variant_name,
          product_name: payload.variant_name,
          unit_price: payload.unit_price,
          cost_price: payload.cost_price,
          supplier_id: payload.supplier_id ?? null,
          giftable: payload.giftable,
          includes_iva: payload.includes_iva,
          group_ids: payload.group_ids ?? [],
          attribute_value_ids: payload.attribute_value_ids ?? [],
        };
        return productApi.update(c.existingId!, update);
      }),
    );

    let createdNew: Array<{ product_variant_id: string }> = [];
    if (newRows.length > 0) {
      createdNew = await productApi.createBulk(
        newRows.map((c) => buildChildPayload(c)),
      );
      if (createdNew.length !== newRows.length) {
        throw new Error(
          `Solo se crearon ${createdNew.length} de ${newRows.length} componentes nuevos`,
        );
      }
    }

    // Build the merged composition list in the order of `components`.
    const newIdQueue = [...createdNew];
    const compositionComponents = components.map((c) => {
      const id = c.existingId ?? newIdQueue.shift()?.product_variant_id;
      if (!id) {
        throw new Error("No se pudo resolver el id de un componente nuevo");
      }
      return {
        child_product_variant_id: id,
        quantity: parseFloat(c.quantity_per_parent) || 1,
      };
    });

    await productCompositionApi.replace({
      tenant_id: tenantId,
      parent_product_variant_id: editingProductId,
      components: compositionComponents,
    });

    onEditSuccess?.(editingProductId);
    close();
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);

    if (isEdit) {
      try {
        await handleEditSubmit();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Error al actualizar el lote",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const childInputs: BulkProductInput[] = components.map((c) =>
      buildChildPayload(c),
    );

    const optimisticTotalPrice = Number(
      childInputs
        .reduce((acc, c, i) => {
          const qty = parseFloat(components[i].quantity_per_parent) || 1;
          return acc + c.unit_price * qty;
        }, 0)
        .toFixed(2),
    );

    const optimisticTotalCost = Number(
      childInputs
        .reduce((acc, c, i) => {
          const qty = parseFloat(components[i].quantity_per_parent) || 1;
          return acc + (c.cost_price || 0) * qty;
        }, 0)
        .toFixed(2),
    );

    const tempId = `temp-bulk-${crypto.randomUUID()}`;

    try {
      onOptimisticCreate({
        tempId,
        sku: parent.sku.trim().toUpperCase(),
        product_name: parent.name.trim(),
        price: optimisticTotalPrice,
        cost_price: optimisticTotalCost,
        supplier_id: parent.supplier_id || undefined,
        tenant_id: tenantId,
      });

      // 1) Bulk-create all children with their attributes.
      const childCreated = await productApi.createBulk(childInputs);
      if (childCreated.length !== components.length) {
        throw new Error(
          `Solo se crearon ${childCreated.length} de ${components.length} componentes. ` +
            "Revisa duplicados de SKU/nombre y vuelve a intentar.",
        );
      }

      // 2) Create the parent (lote) with the summed price and cost.
      const parentTotalPrice = childInputs.reduce((acc, c, i) => {
        const qty = parseFloat(components[i].quantity_per_parent) || 1;
        return acc + c.unit_price * qty;
      }, 0);
      const parentTotalCost = childInputs.reduce((acc, c, i) => {
        const qty = parseFloat(components[i].quantity_per_parent) || 1;
        return acc + (c.cost_price || 0) * qty;
      }, 0);

      const parentCreated = await productApi.create({
        tenant_id: tenantId,
        sku: parent.sku.trim().toUpperCase(),
        product_name: parent.name.trim(),
        price: Number(parentTotalPrice.toFixed(2)),
        cost_price: Number(parentTotalCost.toFixed(2)),
        supplier_id: parent.supplier_id || undefined,
        group_ids: parentGroupIds.length ? parentGroupIds : undefined,
        giftable: isGiftable,
        includes_iva: isIncludesIva,
      });

      // 3) Wire composition with each component's quantity_per_parent.
      await productCompositionApi.replace({
        tenant_id: tenantId,
        parent_product_variant_id: parentCreated.product_variant_id,
        components: childCreated.map((created, i) => ({
          child_product_variant_id: created.product_variant_id,
          quantity: parseFloat(components[i].quantity_per_parent) || 1,
        })),
      });

      onConfirmCreate(tempId, parentCreated.product_variant_id);
      close();
    } catch (e) {
      onRollbackCreate(tempId);
      setError(e instanceof Error ? e.message : "Error al crear el lote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={isEdit ? "Editar lote de productos" : "Crear lote de productos"}
      size="lg"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          {isEdit
            ? "Edita el lote y todos sus productos individuales en una sola operación. Puedes modificar atributos, precios, cantidades y agregar nuevos componentes."
            : "Crea un producto compuesto (lote) y sus componentes individuales en una sola operación. Cada componente puede tener su propio SKU, precio, costo y atributos. El lote no tiene precio propio — el valor se distribuye entre los componentes."}
        </p>
        {loadingEdit && (
          <p className="text-xs text-gray-500">Cargando datos del lote…</p>
        )}

        {/* ─── Producto padre ─────────────────────────────────────────── */}
        <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
          <header>
            <h3 className="text-sm font-semibold text-gray-900">
              Producto padre (el lote)
            </h3>
            <p className="text-xs text-gray-500">
              Es el producto compuesto que el usuario verá en compras y ventas.
              Se desglosa automáticamente en sus componentes al desagrupar.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU del lote"
              placeholder="Ej: LOTE-CAMISAS-M"
              value={parent.sku}
              onChange={(e) =>
                setParent((p) => ({ ...p, sku: e.target.value }))
              }
              required
            />
            <Input
              label="Nombre del lote"
              placeholder="Ej: Lote camisas talla M"
              value={parent.name}
              onChange={(e) =>
                setParent((p) => ({ ...p, name: e.target.value }))
              }
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useParentSkuAsPrefix}
              onChange={(e) => setUseParentSkuAsPrefix(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 font-medium">
              Usar SKU del lote como prefijo para los componentes
            </span>
          </label>
          <p className="text-xs text-gray-500">
            {useParentSkuAsPrefix
              ? `Los SKUs de los componentes comenzarán con "${parent.sku || "[SKU]"}-"`
              : "Ingresa el SKU completo para cada componente"}
          </p>

          <div>
            <Select
              label="Proveedor (opcional)"
              value={parent.supplier_id ?? ""}
              onChange={(e) =>
                setParent((p) => ({ ...p, supplier_id: e.target.value }))
              }
              options={[
                { value: "", label: "Sin proveedor" },
                ...suppliers.map((s) => ({
                  value: s.supplier_id,
                  label: s.supplier_name,
                })),
              ]}
              hint="Se asignará al lote y a todos los componentes"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isGiftable}
              onChange={(e) => setIsGiftable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={submitting}
            />
            <span className="text-sm text-gray-700 font-medium">
              Marcar lote y todos sus componentes como regalables
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isIncludesIva}
              onChange={(e) => setIsIncludesIva(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={submitting}
            />
            <span className="text-sm text-gray-700 font-medium">
              El precio de venta ya incluye IVA (aplica al lote y a todos sus componentes)
            </span>
          </label>

          {/* Grupos/dimensiones del lote — los productos hijos los heredan */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              Familias y dimensiones <span className="text-red-600">*</span>
            </p>
            <p className="text-xs text-gray-500">
              Obligatorio: los grupos asignados al lote se heredan en todos
              los productos simples que lo componen.
            </p>
            {tenantId ? (
              <GroupAssignmentEditor
                tenantId={tenantId}
                value={parentGroupIds}
                onChange={setParentGroupIds}
                disabled={submitting}
              />
            ) : (
              <p className="text-xs text-gray-400">
                No se pudo identificar el tenant.
              </p>
            )}
          </div>

          {/* Atributos del lote — los productos hijos los heredan */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              Atributos heredados (opcional)
            </p>
            <p className="text-xs text-gray-500">
              Los atributos y valores asignados al lote se aplicarán a todos los
              productos que lo componen.
            </p>
            {tenantId ? (
              <AttributeAssignmentEditor
                tenantId={tenantId}
                rows={parentAttributes}
                onChange={setParentAttributes}
                disabled={submitting}
              />
            ) : (
              <p className="text-xs text-gray-400">
                No se pudo identificar el tenant.
              </p>
            )}
          </div>
        </section>

        {/* ─── Configuración de precios ────────────────────────────────── */}
        <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
          <header>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Configuración de precios
            </h3>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useUniformPricing}
                onChange={(e) => setUseUniformPricing(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 font-medium">
                Usar el mismo precio y costo para todos los componentes
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              {useUniformPricing
                ? "Desactiva esta opción si cada componente tiene diferentes precios y costos"
                : "Activa esta opción para ingresar precio y costo una sola vez"}
            </p>
          </header>

          {useUniformPricing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Precio de venta (c/u) para todos (USD)"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 5.00"
                value={uniformPrice}
                onChange={(e) => setUniformPrice(e.target.value)}
                required
              />
              <Input
                label="Costo de adquisición (c/u) para todos (USD)"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 2.50"
                value={uniformCost}
                onChange={(e) => setUniformCost(e.target.value)}
                required
              />
            </div>
          )}
        </section>

        {/* ─── Productos del lote ──────────────────────────────────────── */}
        <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
          <header className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Productos del lote
              </h3>
              <p className="text-xs text-gray-500">
                Cada producto simple es un producto individual con su propio SKU
                {useUniformPricing ? "" : ", precio, costo"} y atributos.
              </p>
            </div>

            {/* Cantidad de componentes */}
            <div className="flex items-end gap-3">
              <div className="w-40">
                <Input
                  label="Cantidad de productos"
                  type="number"
                  step="1"
                  value={String(componentCount)}
                  onChange={(e) => handleCountChange(e.target.value)}
                  onBlur={handleCountBlur}
                  hint={`Mín. ${MIN_COMPONENTS} — máx. ${MAX_COMPONENTS}`}
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-gray-500 pb-1">
                Define cuántos productos simples componen el lote.
              </p>
            </div>
          </header>

          <div className="space-y-4">
            {components.map((c, i) => (
              <div
                key={c.key}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Producto #{i + 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="SKU"
                    placeholder="Ej: CAM-M-001"
                    value={c.sku}
                    onChange={(e) =>
                      updateComponent(c.key, { sku: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Nombre"
                    placeholder="Ej: Camisa talla M"
                    value={c.name}
                    onChange={(e) =>
                      updateComponent(c.key, { name: e.target.value })
                    }
                    required
                  />
                </div>

                {useUniformPricing ? (
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs text-blue-700">
                      Precio: ${" "}
                      {Number(uniformPrice || 0).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      | Costo: ${" "}
                      {Number(uniformCost || 0).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Precio de venta (c/u) (USD)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={c.unit_price}
                      onChange={(e) =>
                        updateComponent(c.key, { unit_price: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="Costo de adquisición (c/u) (USD)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={c.cost_price}
                      onChange={(e) =>
                        updateComponent(c.key, { cost_price: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Atributos del componente
                  </p>
                  <AttributeAssignmentEditor
                    tenantId={tenantId}
                    rows={c.attributes}
                    onChange={(rows) =>
                      updateComponent(c.key, { attributes: rows })
                    }
                    disabled={submitting}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Resumen ────────────────────────────────────────────────── */}
        {components.length > 0 &&
          (() => {
            const totalSalePrice = components.reduce((acc, c) => {
              const price = useUniformPricing
                ? parseFloat(uniformPrice) || 0
                : parseFloat(c.unit_price) || 0;
              return acc + price * (parseFloat(c.quantity_per_parent) || 0);
            }, 0);
            const totalCost = components.reduce((acc, c) => {
              const cost = useUniformPricing
                ? parseFloat(uniformCost) || 0
                : parseFloat(c.cost_price) || 0;
              return acc + cost * (parseFloat(c.quantity_per_parent) || 0);
            }, 0);
            const margin = totalSalePrice - totalCost;
            const marginPercent =
              totalSalePrice > 0
                ? ((margin / totalSalePrice) * 100).toFixed(1)
                : 0;

            return (
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">
                    Resumen del lote:
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right">
                  <div>
                    <p className="text-xs text-blue-500">
                      Precio de venta total
                    </p>
                    <p className="font-semibold text-blue-900">
                      Bs.
                      {totalSalePrice.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-500">Costo total</p>
                    <p className="font-semibold text-blue-900">
                      Bs.
                      {totalCost.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-500">Margen</p>
                    <p className="font-semibold text-blue-900">
                      Bs.
                      {margin.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ({marginPercent}%)
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={components.length === 0 || submitting || loadingEdit}
          >
            {submitting
              ? isEdit
                ? "Guardando..."
                : "Creando lote..."
              : isEdit
                ? `Guardar lote (${components.length} producto${components.length === 1 ? "" : "s"})`
                : `Crear lote y ${components.length} producto${components.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
