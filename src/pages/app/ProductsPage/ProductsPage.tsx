import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/router/actions/product.actions";

import type { ProductsPageLoaderData } from "@/router/loaders/product.loaders";

import { productApi } from "@/api/product.api";
import { productGroupTypeApi, productGroupApi } from "@/api/productGroup.api";
import { tenantAttributeApi, attributeValueApi } from "@/api/attribute.api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";

import { IconEdit, IconEye, IconPlus, IconTrash } from "@/assets/icons";

import type { Product } from "@/interfaces/entities/Product.interface";
import type { CreateProductRequest } from "@/interfaces/api/requests/CreateProductRequest.interface";
import type { UpdateProductRequest } from "@/interfaces/api/requests/UpdateProductRequest.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  TenantProductGroupType,
  TenantProductGroup,
} from "@/interfaces/entities/ProductGroup.interface";
import type {
  TenantAttribute,
  AttributeValue,
} from "@/interfaces/entities/Attribute.interface";

import { ProductDetailModal } from "./ProductDetailModal";
import { ProductUpsertModal } from "./ProductUpsertModal";
import { BulkPackageModal } from "./BulkPackageModal";

const LIMIT = 100;

type ProductWithVariant = Product & {
  variant_name?: string;
  unit_price?: number;
  product_variant_id?: string;
  tenant_name?: string;
  is_composite?: boolean;
};

interface UpsertModalState {
  open: boolean;
  mode: "create" | "edit";
  product?: ProductWithVariant;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProductsPage() {
  const { initialProducts, tenants } =
    useLoaderData() as ProductsPageLoaderData;
  const { user: currentUser } = useAuth();

  const isSuperAdmin = currentUser?.role.role_id === 1;
  const canManageProducts = isSuperAdmin || currentUser?.role.role_id === 2;
  const tenantId = currentUser?.tenant.tenant_id ?? "";

  // ─── Product list state ────────────────────────────────────────────────────

  const [products, setProducts] = useState<ProductWithVariant[]>(
    (initialProducts?.products ?? []) as ProductWithVariant[],
  );
  const [page, setPage] = useState(initialProducts?.page ?? 1);
  const [totalPages] = useState(
    Math.ceil(
      (initialProducts?.total ?? 0) / (initialProducts?.limit ?? LIMIT),
    ),
  );
  const [, setTotal] = useState(initialProducts?.total ?? 0);

  // ─── Local filter state (name/SKU, type, supplier text) ──────────────────

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "simple" | "composite">(
    "all",
  );
  const [filterSupplierQuery, setFilterSupplierQuery] = useState<string>("");
  const debouncedSupplierQuery = useDebounce(filterSupplierQuery, 300);

  // ─── Backend filter state (MG1, MG2, MG3) ────────────────────────────────

  // MG1 — dimension/group filter
  const [groupTypes, setGroupTypes] = useState<TenantProductGroupType[]>([]);
  const [groupsByType, setGroupsByType] = useState<
    Record<string, TenantProductGroup[]>
  >({});
  const [filterDimensionTypeId, setFilterDimensionTypeId] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");

  // MG2 — attribute/value filter
  const [attributes, setAttributes] = useState<TenantAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  const [filterAttributeId, setFilterAttributeId] = useState("");
  const [filterAttributeValueId, setFilterAttributeValueId] = useState("");

  // MG3 — no supplier filter
  const [filterNoSupplier, setFilterNoSupplier] = useState(false);

  // ─── Modal / toast state ──────────────────────────────────────────────────

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithVariant | null>(null);
  const [upsertModal, setUpsertModal] = useState<UpsertModalState>({
    open: false,
    mode: "create",
  });
  const [isBulkPackageOpen, setIsBulkPackageOpen] = useState(false);
  const [editingCompositeId, setEditingCompositeId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  // ─── Load dimension types and attributes for non-superadmin ──────────────

  useEffect(() => {
    if (isSuperAdmin || !tenantId) return;

    productGroupTypeApi
      .listByTenant(tenantId)
      .then(setGroupTypes)
      .catch(() => {});

    tenantAttributeApi
      .listByTenant(tenantId)
      .then(setAttributes)
      .catch(() => {});
  }, [tenantId, isSuperAdmin]);

  // Load groups when a dimension type is selected
  useEffect(() => {
    if (!filterDimensionTypeId || !tenantId) {
      setGroupsByType((prev) => {
        const next = { ...prev };
        delete next[filterDimensionTypeId];
        return next;
      });
      setFilterGroupId("");
      return;
    }
    if (groupsByType[filterDimensionTypeId]) return; // already cached
    productGroupApi
      .tree(tenantId, filterDimensionTypeId)
      .then((groups) =>
        setGroupsByType((prev) => ({
          ...prev,
          [filterDimensionTypeId]: groups,
        })),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDimensionTypeId, tenantId]);

  // Load attribute values when an attribute is selected
  useEffect(() => {
    setFilterAttributeValueId("");
    setAttributeValues([]);
    if (!filterAttributeId || !tenantId) return;
    attributeValueApi
      .listByAttribute(tenantId, filterAttributeId)
      .then(setAttributeValues)
      .catch(() => {});
  }, [filterAttributeId, tenantId]);

  // ─── Re-fetch from backend when MG1/MG2/MG3 filters change ──────────────

  const fetchWithFilters = useCallback(
    async (groupId: string, attrValueId: string, noSup: boolean) => {
      if (isSuperAdmin || !tenantId) return;
      try {
        const data = await productApi.search(
          tenantId,
          "",
          1,
          LIMIT,
          groupId ? [groupId] : undefined,
          attrValueId ? [attrValueId] : undefined,
          noSup || undefined,
        );
        setProducts(data.products as ProductWithVariant[]);
        setTotal(data.total);
      } catch {
        // silently maintain current list on fetch error
      }
    },
    [tenantId, isSuperAdmin],
  );

  useEffect(() => {
    const hasBackendFilter =
      filterGroupId || filterAttributeValueId || filterNoSupplier;
    if (!hasBackendFilter) {
      // Reset to the initial loader data when all backend filters are cleared
      setProducts((initialProducts?.products ?? []) as ProductWithVariant[]);
      setTotal(initialProducts?.total ?? 0);
      return;
    }
    fetchWithFilters(filterGroupId, filterAttributeValueId, filterNoSupplier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGroupId, filterAttributeValueId, filterNoSupplier]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getProductId = (p: ProductWithVariant) =>
    p.product_variant_id ?? p.product_id;

  const getProductName = (p: ProductWithVariant) =>
    p.variant_name ?? p.product_name ?? "—";

  const getProductPrice = (p: ProductWithVariant) =>
    Number(p.unit_price ?? p.price ?? 0);

  // ─── Local filtering (name/SKU, type, supplier text) ─────────────────────

  const getFilteredProducts = (): ProductWithVariant[] => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          getProductName(p).toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query),
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((p) =>
        filterType === "composite" ? p.is_composite : !p.is_composite,
      );
    }

    if (debouncedSupplierQuery.trim()) {
      const q = debouncedSupplierQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.supplier_name?.toLowerCase().includes(q),
      );
    }

    filtered.sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    );

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreateProduct = async (
    data: CreateProductRequest,
  ): Promise<string | null> => {
    const tempId = `temp-${Date.now()}`;
    const tempProduct: ProductWithVariant = {
      product_id: tempId,
      sku: data.sku,
      product_name: data.product_name,
      description: data.description,
      price: data.price,
      tenant_id: data.tenant_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProducts((prev) => [tempProduct, ...prev]);
    setTotal((prev) => prev + 1);

    try {
      const result = await createProduct(data);
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === tempId
            ? {
                ...tempProduct,
                product_id: result.product_variant_id,
                product_variant_id: result.product_variant_id,
              }
            : p,
        ),
      );
      setToast({ mode: "success", message: "Producto creado exitosamente" });
      return result.product_variant_id;
    } catch (error) {
      setProducts((prev) => prev.filter((p) => p.product_id !== tempId));
      setTotal((prev) => prev - 1);
      const message =
        error instanceof Error ? error.message : "Error al crear producto";
      setToast({ mode: "error", message });
      throw error;
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    data: UpdateProductRequest,
    meta?: { supplier_name?: string },
  ): Promise<void> => {
    let previousSnapshot: ProductWithVariant[] | undefined;
    setProducts((prev) => {
      previousSnapshot = prev;
      return prev.map((p) =>
        getProductId(p) === productId
          ? {
              ...p,
              ...data,
              // Normalize null → undefined for the ProductWithVariant type
              supplier_id: data.supplier_id ?? undefined,
              supplier_name:
                meta?.supplier_name !== undefined
                  ? meta.supplier_name
                  : data.supplier_id === undefined
                    ? p.supplier_name
                    : data.supplier_id === null || data.supplier_id === ""
                      ? undefined
                      : p.supplier_name,
            }
          : p,
      );
    });

    try {
      const updated = await updateProduct(productId, data);
      setProducts((prev) =>
        prev.map((p) =>
          getProductId(p) === productId ? { ...p, ...updated } : p,
        ),
      );
      setToast({
        mode: "success",
        message: "Producto actualizado exitosamente",
      });
    } catch (error) {
      if (previousSnapshot) setProducts(previousSnapshot);
      const message =
        error instanceof Error ? error.message : "Error al actualizar producto";
      setToast({ mode: "error", message });
      throw error;
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este producto?")) return;
    const productToDelete = products.find((p) => getProductId(p) === productId);
    setProducts((prev) => prev.filter((p) => getProductId(p) !== productId));
    setTotal((prev) => prev - 1);
    try {
      await deleteProduct(productId);
      setToast({ mode: "success", message: "Producto eliminado exitosamente" });
    } catch (error) {
      if (productToDelete) {
        setProducts((prev) => [...prev, productToDelete]);
        setTotal((prev) => prev + 1);
      }
      const message =
        error instanceof Error ? error.message : "Error al eliminar producto";
      setToast({ mode: "error", message });
    }
  };

  const openCreate = () => setUpsertModal({ open: true, mode: "create" });

  const openEdit = (p: ProductWithVariant) => {
    if (p.is_composite && p.product_variant_id) {
      setEditingCompositeId(p.product_variant_id);
      setIsBulkPackageOpen(true);
      return;
    }
    setUpsertModal({ open: true, mode: "edit", product: p });
  };

  const closeModal = () => setUpsertModal({ open: false, mode: "create" });

  const clearBackendFilters = () => {
    setFilterDimensionTypeId("");
    setFilterGroupId("");
    setFilterAttributeId("");
    setFilterAttributeValueId("");
    setFilterNoSupplier(false);
  };

  const hasBackendFilters =
    !!filterGroupId || !!filterAttributeValueId || filterNoSupplier;

  const currentGroups = groupsByType[filterDimensionTypeId] ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Productos
        </h1>
        <p className="text-gray-600">
          {isSuperAdmin
            ? "Catálogo de productos de todos los tenants"
            : `Catálogo de productos y servicios de ${currentUser?.tenant.tenant_name}`}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6 space-y-4">
        {/* Row 1: text search + type + supplier text + action buttons */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
          <div className="flex-1 min-w-0">
            <Input
              label="Buscar producto"
              placeholder="Buscar por nombre o SKU"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="w-full lg:w-48">
            <Select
              label="Tipo de producto"
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as "all" | "simple" | "composite")
              }
              options={[
                { value: "all", label: "Todos" },
                { value: "simple", label: "Productos simples" },
                { value: "composite", label: "Lotes" },
              ]}
              placeholder="Seleccionar"
            />
          </div>

          <div className="flex-1 lg:w-48">
            <Input
              label="Proveedor"
              placeholder="Buscar proveedor..."
              value={filterSupplierQuery}
              onChange={(e) => setFilterSupplierQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            {canManageProducts && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsBulkPackageOpen(true)}
                  className="w-full lg:w-auto"
                  title="Crear un lote y todas sus unidades en una sola operación"
                >
                  <IconPlus />
                  Crear lote
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={openCreate}
                  className="w-full lg:w-auto"
                >
                  <IconPlus />
                  Nuevo Producto
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: backend filters (MG1, MG2, MG3) — solo para no-superadmin */}
        {!isSuperAdmin && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex flex-wrap gap-4 items-end">
              {/* MG1 — Dimensiones/familias */}
              {groupTypes.length > 0 && (
                <>
                  <div className="w-56">
                    <Select
                      label="Dimensión"
                      value={filterDimensionTypeId}
                      onChange={(e) => {
                        setFilterDimensionTypeId(e.target.value);
                        setFilterGroupId("");
                      }}
                      placeholder="Todas las dimensiones"
                      options={[
                        { value: "", label: "Todas las dimensiones" },
                        ...groupTypes.map((t) => ({
                          value: t.tenant_product_group_type_id,
                          label: t.type_name,
                        })),
                      ]}
                    />
                  </div>

                  {filterDimensionTypeId && (
                    <div className="w-52">
                      <Select
                        label="Familia / grupo"
                        value={filterGroupId}
                        onChange={(e) => setFilterGroupId(e.target.value)}
                        placeholder="Todos los grupos"
                        options={[
                          { value: "", label: "Todos los grupos" },
                          ...currentGroups.map((g) => ({
                            value: g.tenant_product_group_id,
                            label: `${"—".repeat(g.hierarchy_level ?? 0)} ${g.group_name}`,
                          })),
                        ]}
                      />
                    </div>
                  )}
                </>
              )}

              {/* MG2 — Atributos y valores */}
              {attributes.length > 0 && (
                <>
                  <div className="w-48">
                    <Select
                      label="Atributo"
                      value={filterAttributeId}
                      onChange={(e) => setFilterAttributeId(e.target.value)}
                      placeholder="Todos los atributos"
                      options={[
                        { value: "", label: "Todos los atributos" },
                        ...attributes.map((a) => ({
                          value: a.tenant_attribute_id,
                          label: a.attribute_name,
                        })),
                      ]}
                    />
                  </div>

                  {filterAttributeId && attributeValues.length > 0 && (
                    <div className="w-48">
                      <Select
                        label="Valor"
                        value={filterAttributeValueId}
                        onChange={(e) =>
                          setFilterAttributeValueId(e.target.value)
                        }
                        placeholder="Todos los valores"
                        options={[
                          { value: "", label: "Todos los valores" },
                          ...attributeValues.map((v) => ({
                            value: v.attribute_value_id,
                            label: v.value,
                          })),
                        ]}
                      />
                    </div>
                  )}
                </>
              )}

              {/* MG3 — Sin proveedor */}
              <div className="flex items-center gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={filterNoSupplier}
                    onChange={(e) => setFilterNoSupplier(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Sin proveedor
                </label>
              </div>

              {/* Limpiar filtros backend */}
              {hasBackendFilters && (
                <button
                  type="button"
                  onClick={clearBackendFilters}
                  className="text-xs text-blue-600 hover:underline pb-1"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          columns={[
            { key: "sku", label: "SKU", width: "14%" },
            {
              key: "product_name" as keyof Product,
              label: "Nombre",
              width: "14%",
              render: (_: unknown, row: Product) =>
                getProductName(row as ProductWithVariant),
            },
            {
              key: "supplier_name" as keyof Product,
              label: "Proveedor",
              width: "14%",
              render: (_: unknown, row: Product) =>
                (row as ProductWithVariant).supplier_name ?? (
                  <span className="text-gray-400 text-xs">—</span>
                ),
            },
            {
              key: "is_composite" as keyof Product,
              label: "Tipo",
              width: "14%",
              render: (_: unknown, row: Product) =>
                (row as ProductWithVariant).is_composite ? (
                  <Badge variant="secondary" className="text-xs">
                    Lote
                  </Badge>
                ) : (
                  <Badge variant="gray" className="text-xs">
                    Simple
                  </Badge>
                ),
            },
            {
              key: "cost_price" as keyof Product,
              label: "Costo",
              width: "14%",
              render: (_: unknown, row: Product) => {
                const cost = (row as ProductWithVariant).cost_price;
                return cost != null ? (
                  `Bs. ${Number(cost).toLocaleString("es-VE")}`
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                );
              },
            },
            {
              key: "price" as keyof Product,
              label: "Precio venta",
              width: "14%",
              render: (_: unknown, row: Product) =>
                `Bs. ${getProductPrice(row as ProductWithVariant).toLocaleString("es-VE")}`,
            },
            ...(isSuperAdmin
              ? [
                  {
                    key: "tenant_id" as keyof Product,
                    label: "Tenant",
                    width: "10%",
                    render: (_: unknown, row: Product) =>
                      (row as ProductWithVariant).tenant_name ?? "—",
                  },
                ]
              : []),
            {
              key: "actions" as keyof Product,
              label: "Acciones",
              width: "14%",
              render: (_: unknown, row: Product) => (
                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    onClick={() =>
                      setSelectedProduct(row as ProductWithVariant)
                    }
                    title="Ver detalles"
                    variant="ghost"
                    className="hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <IconEye />
                  </Button>
                  {canManageProducts && (
                    <>
                      <Button
                        onClick={() => openEdit(row as ProductWithVariant)}
                        title="Editar producto"
                        variant="ghost"
                        className="hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <IconEdit />
                      </Button>
                      <Button
                        onClick={() =>
                          handleDeleteProduct(
                            getProductId(row as ProductWithVariant),
                          )
                        }
                        title="Eliminar producto"
                        variant="danger"
                        className="hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <IconTrash />
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={filteredProducts}
          emptyMessage={
            filteredProducts.length === 0 &&
            (searchQuery ||
              filterType !== "all" ||
              filterSupplierQuery ||
              hasBackendFilters)
              ? "No hay productos que coincidan con los filtros"
              : "No hay productos para mostrar"
          }
          onRowClick={(row) => setSelectedProduct(row as ProductWithVariant)}
        />
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <ProductUpsertModal
        isOpen={upsertModal.open}
        mode={upsertModal.mode}
        product={upsertModal.product}
        isSuperAdmin={isSuperAdmin}
        currentTenantId={tenantId}
        tenants={tenants}
        onClose={closeModal}
        onCreate={handleCreateProduct}
        onUpdate={handleUpdateProduct}
      />

      <BulkPackageModal
        isOpen={isBulkPackageOpen}
        tenantId={tenantId}
        mode={editingCompositeId ? "edit" : "create"}
        editingProductId={editingCompositeId ?? undefined}
        onClose={() => {
          setIsBulkPackageOpen(false);
          setEditingCompositeId(null);
        }}
        onEditSuccess={() => {
          setIsBulkPackageOpen(false);
          setEditingCompositeId(null);
          setToast({
            mode: "success",
            message:
              "Lote actualizado. Recarga la página para ver los cambios.",
          });
        }}
        onOptimisticCreate={(product) => {
          setProducts((prev) => [
            {
              product_id: product.tempId,
              product_variant_id: product.tempId,
              sku: product.sku,
              product_name: product.product_name,
              variant_name: product.product_name,
              tenant_id: product.tenant_id,
              price: product.price,
              unit_price: product.price,
              cost_price: product.cost_price,
              supplier_id: product.supplier_id,
              is_composite: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ]);
          setTotal((prev) => prev + 1);
        }}
        onConfirmCreate={(tempId, createdParentId) => {
          setProducts((prev) =>
            prev.map((product) =>
              getProductId(product) === tempId
                ? {
                    ...product,
                    product_id: createdParentId,
                    product_variant_id: createdParentId,
                  }
                : product,
            ),
          );
          setIsBulkPackageOpen(false);
          setToast({
            mode: "success",
            message: "Lote creado. Recarga la página para verlo en la lista.",
          });
        }}
        onRollbackCreate={(tempId) => {
          setProducts((prev) =>
            prev.filter((product) => getProductId(product) !== tempId),
          );
          setTotal((prev) => Math.max(prev - 1, 0));
        }}
      />
    </div>
  );
}
