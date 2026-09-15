import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  AttributeAssignmentEditor,
  type AttributeAssignmentRow,
} from "@/components/ui/AttributeAssignmentEditor";
import { GroupAssignmentEditor } from "@/components/ui/GroupAssignmentEditor";

import { productApi } from "@/api/product.api";
import { productCompositionApi } from "@/api/productComposition.api";
import { productVariantGroupApi } from "@/api/productGroup.api";
import { purchaseApi } from "@/api/purchase.api";

import type { Product } from "@/interfaces/entities/Product.interface";
import type { Supplier } from "@/interfaces/entities/Purchase.interface";
import type { Tenant } from "@/interfaces/entities/Tenant.interface";
import type { CreateProductRequest } from "@/interfaces/api/requests/CreateProductRequest.interface";
import type { UpdateProductRequest } from "@/interfaces/api/requests/UpdateProductRequest.interface";

import {
  buildProductUpsertSchema,
  type ProductUpsertFormData,
} from "./product-upsert.schema";

type ProductWithVariant = Product & {
  variant_name?: string;
  unit_price?: number;
  cost_price?: number;
  product_variant_id?: string;
  is_composite?: boolean;
};

interface ProductUpsertModalProps {
  mode: "create" | "edit";
  isOpen: boolean;
  product?: ProductWithVariant;
  currentTenantId: string;
  tenants: Tenant[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onCreate: (data: CreateProductRequest) => Promise<string | null>;
  onUpdate: (
    productId: string,
    data: UpdateProductRequest,
    meta?: { supplier_name?: string },
  ) => Promise<void>;
}

export function ProductUpsertModal({
  mode,
  isOpen,
  product,
  currentTenantId,
  tenants,
  isSuperAdmin,
  onClose,
  onCreate,
  onUpdate,
}: ProductUpsertModalProps) {
  const isEditing = mode === "edit";
  const requireTenant = isSuperAdmin && !isEditing;

  const [attributeRows, setAttributeRows] = useState<AttributeAssignmentRow[]>(
    [],
  );
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductUpsertFormData>({
    resolver: zodResolver(buildProductUpsertSchema(requireTenant)),
    defaultValues:
      isEditing && product
        ? {
            sku: product.sku,
            product_name: product.variant_name ?? product.product_name ?? "",
            description: product.description ?? "",
            price: String(product.unit_price ?? product.price ?? ""),
            cost_price:
              product.cost_price !== undefined && product.cost_price !== null
                ? String(product.cost_price)
                : "",
            supplier_id: product.supplier_id ?? "",
            giftable: product.giftable ?? false,
            includes_iva: product.includes_iva ?? false,
            giftable_from:
              product.giftable_from != null
                ? String(product.giftable_from)
                : "",
            tenant_id: "",
          }
        : {
            sku: "",
            product_name: "",
            description: "",
            price: "",
            cost_price: "",
            supplier_id: "",
            giftable: false,
            includes_iva: false,
            giftable_from: "",
            tenant_id: "",
          },
  });

  const isGiftable = watch("giftable") ?? false;

  // Reset modal-local state whenever it opens or the product changes.
  useEffect(() => {
    if (!isOpen) return;
    setAttributeRows([]);
    setGroupIds([]);
    setSaveError(null);
    reset(
      isEditing && product
        ? {
            sku: product.sku,
            product_name: product.variant_name ?? product.product_name ?? "",
            description: product.description ?? "",
            price: String(product.unit_price ?? product.price ?? ""),
            cost_price:
              product.cost_price !== undefined && product.cost_price !== null
                ? String(product.cost_price)
                : "",
            supplier_id: product.supplier_id ?? "",
            giftable: product.giftable ?? false,
            includes_iva: product.includes_iva ?? false,
            giftable_from:
              product.giftable_from != null
                ? String(product.giftable_from)
                : "",
            tenant_id: "",
          }
        : {
            sku: "",
            product_name: "",
            description: "",
            price: "",
            cost_price: "",
            supplier_id: "",
            giftable: false,
            includes_iva: false,
            giftable_from: "",
            tenant_id: "",
          },
    );

    purchaseApi
      .listSuppliers()
      .then(setSuppliers)
      .catch(() => {});
  }, [isOpen, product, isEditing, reset]);

  // Edit mode: fetch the full state (attributes, groups) so the sub-sections
  // open already populated with what's in the database.
  useEffect(() => {
    if (!isOpen || !isEditing || !product) return;
    const productId = product.product_variant_id ?? product.product_id;
    const tenantId = product.tenant_id;
    if (!productId || !tenantId) return;

    let cancelled = false;

    (async () => {
      try {
        const detail = await productApi.getByIdWithAttributes(
          tenantId,
          productId,
        );
        if (cancelled) return;

        // Group attribute_value rows by tenant_attribute_id.
        const byAttr = new Map<
          string,
          { attribute_name: string; selected_value_ids: string[] }
        >();
        for (const a of detail.attributes ?? []) {
          const existing = byAttr.get(a.tenant_attribute_id);
          if (existing) {
            existing.selected_value_ids.push(a.attribute_value_id);
          } else {
            byAttr.set(a.tenant_attribute_id, {
              attribute_name: a.attribute_name,
              selected_value_ids: [a.attribute_value_id],
            });
          }
        }
        setAttributeRows(
          Array.from(byAttr.entries()).map(([id, r]) => ({
            tenant_attribute_id: id,
            attribute_name: r.attribute_name,
            selected_value_ids: r.selected_value_ids,
          })),
        );

        setGroupIds(
          (detail.groups ?? []).map((g) => g.tenant_product_group_id),
        );

        // Sync boolean flags from the authoritative detail response, since the
        // product list queries may not include all fields.
        setValue('includes_iva', (detail as any).includes_iva ?? false);
        setValue('giftable', (detail as any).giftable ?? false);
      } catch (err) {
        if (!cancelled) {
          setSaveError(
            err instanceof Error
              ? `No se pudieron cargar los detalles del producto: ${err.message}`
              : "No se pudieron cargar los detalles del producto.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isEditing, product]);

  const targetTenantId = isSuperAdmin
    ? watch("tenant_id") || currentTenantId
    : currentTenantId;

  const flattenAttributeValues = (rows: AttributeAssignmentRow[]) =>
    rows.flatMap((r) => r.selected_value_ids);

  const onSubmit = async (data: ProductUpsertFormData) => {
    setSaveError(null);
    const price = parseFloat(data.price);
    const costPrice =
      data.cost_price && data.cost_price !== ""
        ? parseFloat(data.cost_price)
        : undefined;
    const supplierId =
      data.supplier_id && data.supplier_id !== ""
        ? data.supplier_id
        : undefined;
    const giftableFrom =
      data.giftable && data.giftable_from && data.giftable_from !== ""
        ? parseFloat(data.giftable_from)
        : undefined;
    const tenantId = isSuperAdmin
      ? data.tenant_id || currentTenantId
      : currentTenantId;

    const attribute_value_ids = flattenAttributeValues(attributeRows);

    setIsSaving(true);
    try {
      let variantId: string | null = null;

      if (isEditing && product) {
        const productId = product.product_variant_id ?? product.product_id;
        // In edit mode, an empty supplier_id must be sent as null so the
        // backend sets the field to NULL (undefined would leave it unchanged).
        const editSupplierId: string | null =
          data.supplier_id && data.supplier_id !== "" ? data.supplier_id : null;
        const supplierName = editSupplierId
          ? (suppliers.find((s) => s.supplier_id === editSupplierId)
              ?.supplier_name ?? undefined)
          : undefined;
        await onUpdate(
          productId,
          {
            product_name: data.product_name,
            description: data.description || undefined,
            unit_price: price,
            cost_price: costPrice,
            supplier_id: editSupplierId,
            giftable: data.giftable ?? false,
            includes_iva: data.includes_iva ?? false,
            giftable_from: giftableFrom,
            attribute_value_ids,
            group_ids: groupIds,
          },
          { supplier_name: supplierName },
        );
        variantId = productId;

        if (product.is_composite) {
          // MGP1 + MGP4: propagate supplier, giftable, attributes, and groups to all children.
          const composition = await productApi.getComposition(
            product.tenant_id,
            productId,
          );
          await Promise.all(
            composition.map((child) =>
              productApi.update(child.child_product_variant_id, {
                supplier_id: editSupplierId,
                giftable: data.giftable ?? false,
                includes_iva: data.includes_iva ?? false,
                attribute_value_ids,
                group_ids: groupIds,
              }),
            ),
          );
        } else {
          // MGP2/MGP3: sync parent batch giftable based on this child's new value.
          const parents = await productCompositionApi.byChild(
            product.tenant_id,
            productId,
          );
          if (parents.length > 0) {
            const newGiftable = data.giftable ?? false;
            await Promise.all(
              parents.map(async (p) => {
                if (!newGiftable) {
                  // MGP3: always unmark parent when a child is unmarked.
                  await productApi.update(p.parent_product_variant_id, {
                    giftable: false,
                  });
                } else {
                  // MGP2: mark parent only when ALL siblings are now giftable.
                  const siblings = await productApi.getComposition(
                    product.tenant_id,
                    p.parent_product_variant_id,
                  );
                  const otherIds = siblings
                    .filter((s) => s.child_product_variant_id !== productId)
                    .map((s) => s.child_product_variant_id);
                  if (otherIds.length === 0) {
                    await productApi.update(p.parent_product_variant_id, {
                      giftable: true,
                    });
                  } else {
                    const details = await Promise.all(
                      otherIds.map((id) =>
                        productApi.getByIdWithAttributes(product.tenant_id, id),
                      ),
                    );
                    if (details.every((s) => s.giftable === true)) {
                      await productApi.update(p.parent_product_variant_id, {
                        giftable: true,
                      });
                    }
                  }
                }
              }),
            );
          }
        }
      } else {
        variantId = await onCreate({
          tenant_id: tenantId,
          sku: data.sku.toUpperCase().trim(),
          product_name: data.product_name,
          description: data.description || undefined,
          price,
          cost_price: costPrice,
          supplier_id: supplierId,
          giftable: data.giftable ?? false,
          includes_iva: data.includes_iva ?? false,
          giftable_from: giftableFrom,
          attribute_value_ids,
          group_ids: groupIds,
        });
      }

      if (variantId && isEditing) {
        await productVariantGroupApi.replace(tenantId, variantId, groupIds);
      }

      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Error al guardar el producto",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Producto" : "Nuevo Producto"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Basic info ───────────────────────────── */}
        <section className="space-y-4">
          {isSuperAdmin && !isEditing && (
            <Controller
              name="tenant_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Empresa (Tenant)"
                  value={field.value}
                  onChange={field.onChange}
                  name={field.name}
                  options={tenants.map((t) => ({
                    value: t.tenant_id,
                    label: t.tenant_name,
                  }))}
                  error={errors.tenant_id?.message}
                  required
                />
              )}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU"
              placeholder="Ej: PROD-001, ABC123"
              error={errors.sku?.message}
              disabled={isEditing}
              hint={
                isEditing
                  ? "No se puede cambiar el SKU de un producto existente"
                  : undefined
              }
              required
              {...register("sku")}
            />
            <Input
              label="Costo unitario"
              type="number"
              placeholder="Ej: 12000.00"
              step="0.01"
              min="0"
              hint="Costo de adquisición. Se actualiza al recibir compras."
              error={errors.cost_price?.message}
              {...register("cost_price")}
            />
            <Input
              label="Precio Unitario"
              type="number"
              placeholder="Ej: 25000.00"
              step="0.01"
              min="0"
              error={errors.price?.message}
              required
              {...register("price")}
            />
          </div>

          <Controller
            name="includes_iva"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={field.value ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <span className="text-sm text-gray-700 font-medium">
                  Precio de venta incluye IVA
                </span>
              </label>
            )}
          />

          <Input
            label="Nombre del Producto"
            placeholder="Ej: Laptop Dell XPS 13"
            error={errors.product_name?.message}
            required
            {...register("product_name")}
          />

          <Input
            label="Descripción"
            placeholder="Descripción del producto (opcional)"
            {...register("description")}
          />

          <Controller
            name="supplier_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Proveedor"
                value={field.value ?? ""}
                onChange={field.onChange}
                name={field.name}
                options={[
                  { value: "", label: "Sin proveedor" },
                  ...suppliers.map((s) => ({
                    value: s.supplier_id,
                    label: s.supplier_name,
                  })),
                ]}
              />
            )}
          />

          <div className="flex flex-col gap-3">
            <Controller
              name="giftable"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    Aplica como producto regalable
                  </span>
                </label>
              )}
            />
          </div>

          {isGiftable && (
            <Input
              label="Monto mínimo de compra para ser regalable (Bs.)"
              type="number"
              placeholder="Ej: 50000.00"
              step="0.01"
              min="0"
              hint="Si se deja vacío, no hay monto mínimo."
              error={errors.giftable_from?.message}
              {...register("giftable_from")}
            />
          )}
        </section>

        {/* ─── Group assignment ─────────────────────── */}
        <section className="space-y-2">
          <header>
            <h3 className="text-sm font-semibold text-gray-900">
              Familias y dimensiones del tenant
            </h3>
            <p className="text-xs text-gray-500">
              Asigna el producto a Departamento, Familia, Marca, etc. para
              filtrado y promociones.
            </p>
          </header>
          {targetTenantId ? (
            <GroupAssignmentEditor
              tenantId={targetTenantId}
              value={groupIds}
              onChange={setGroupIds}
              disabled={isSaving}
            />
          ) : (
            <p className="text-xs text-gray-500">
              Seleccione una empresa primero.
            </p>
          )}
        </section>

        {/* ─── Attributes ───────────────────────────── */}
        <section className="space-y-2">
          <header>
            <h3 className="text-sm font-semibold text-gray-900">Atributos</h3>
            <p className="text-xs text-gray-500">
              Color, talla, material, etc. Los atributos se buscan/crean inline
              contra el catálogo del tenant + globales.
            </p>
          </header>
          {targetTenantId ? (
            <AttributeAssignmentEditor
              tenantId={targetTenantId}
              rows={attributeRows}
              onChange={setAttributeRows}
              disabled={isSaving}
            />
          ) : (
            <p className="text-xs text-gray-500">
              Seleccione una empresa primero.
            </p>
          )}
        </section>

        {saveError && (
          <p className="text-sm text-red-600 font-medium">{saveError}</p>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isSaving}>
            {isSaving
              ? "Guardando..."
              : isEditing
                ? "Guardar Cambios"
                : "Crear Producto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
