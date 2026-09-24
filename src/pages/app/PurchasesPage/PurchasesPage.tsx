import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { purchaseApi } from "@/api/purchase.api";

import { useAuth } from "@/context/AuthContext";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  ProductVariantComboBox,
  type ProductVariantSelection,
} from "@/components/ui/ProductVariantComboBox";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";

import {
  IconCalendar,
  IconCheckCircle,
  IconEye,
  IconPackage,
  IconPlus,
  IconShoppingCart,
  IconX,
} from "@/assets/icons";

import { PurchaseOrderDetailPanel } from "@/pages/app/SupplyChain/PurchaseOrderDetailPanel";

import type {
  CreatePurchaseOrderRequest,
  CreatePurchaseOrderItemRequest,
  CreatePurchasePaymentRequest,
} from "@/interfaces/api/requests/PurchaseModuleRequests.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  PurchaseMatching,
  PurchaseOrder,
  PurchaseOrderDetail,
} from "@/interfaces/entities/Purchase.interface";
import type { PurchasesPageLoaderData } from "@/router/loaders/purchase.loaders";

import {
  formatCurrency,
  formatDate,
  getNextOrderStatuses,
  getOrderStatusTone,
  getPayableStatusTone,
  getStatusLabelById,
} from "@/utils/purchase";

interface PurchaseItemFormRow {
  product_variant_id: string;
  quantity_ordered: string;
  variant_name?: string;
  sku?: string;
}

interface PurchaseFormState {
  supplier_id: string;
  warehouse_id: string;
  expected_delivery_date: string;
  has_invoice: boolean;
  payment_condition: "CREDIT" | "IN_FULL";
  payment_due_date: string;
  items: PurchaseItemFormRow[];
}

type PurchaseFormErrors = {
  supplier_id?: string;
  warehouse_id?: string;
  expected_delivery_date?: string;
  payment_due_date?: string;
  items?: string;
};

const emptyItem: PurchaseItemFormRow = {
  product_variant_id: "",
  quantity_ordered: "1",
};

const emptyForm: PurchaseFormState = {
  supplier_id: "",
  warehouse_id: "",
  expected_delivery_date: "",
  has_invoice: true,
  payment_condition: "CREDIT",
  payment_due_date: "",
  items: [{ ...emptyItem }],
};

export function PurchasesPage() {
  const {
    orders: initialOrders,
    suppliers,
    warehouses,
    catalogs,
    currentTenantName,
    isSuperuser,
    tenants,
  } = useLoaderData() as PurchasesPageLoaderData;
  const { user } = useAuth();

  const canManage = user?.role.role_id === 1 || user?.role.role_id === 2;

  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<PurchaseFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<PurchaseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<PurchaseOrderDetail | null>(null);
  const [selectedMatching, setSelectedMatching] =
    useState<PurchaseMatching | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesTenant =
        !isSuperuser ||
        tenantFilter === "all" ||
        order.tenant_id === tenantFilter;

      if (!matchesTenant) return false;
      if (!query) return true;

      return (
        order.purchase_order_id.toLowerCase().includes(query) ||
        order.supplier_name.toLowerCase().includes(query) ||
        (order.warehouse_name ?? "").toLowerCase().includes(query) ||
        (order.tenant_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [isSuperuser, orders, search, tenantFilter]);

  const stats = useMemo(() => {
    const source = filteredOrders;
    return {
      total: source.length,
      pending: source.filter((order) => order.purchase_order_status_id === 1)
        .length,
      delivered: source.filter((order) => order.purchase_order_status_id === 3)
        .length,
      outstanding: source.reduce(
        (acc, order) => acc + Number(order.balance_due ?? 0),
        0,
      ),
    };
  }, [filteredOrders]);

  const tenantOptions = tenants.map((tenant) => ({
    value: tenant.tenant_id,
    label: tenant.tenant_name,
  }));

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.supplier_id,
    label: supplier.supplier_name,
  }));

  const warehouseOptions = warehouses.map((warehouse) => ({
    value: warehouse.warehouse_id,
    label: warehouse.warehouse_name,
  }));

  const resetCreateModal = () => {
    setIsCreateOpen(false);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const updateOrderRow = (updated: PurchaseOrder) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.purchase_order_id === updated.purchase_order_id
          ? { ...order, ...updated }
          : order,
      ),
    );
  };

  const openDetail = async (orderId: string) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    try {
      const [order, matching] = await Promise.all([
        purchaseApi.getOrderById(orderId),
        purchaseApi.getMatching(orderId).catch(
          () =>
            ({
              purchase_order_id: orderId,
              matching_found: false,
            }) as PurchaseMatching,
        ),
      ]);
      setSelectedOrder(order);
      setSelectedMatching(matching);
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle de la orden",
      });
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const validateForm = () => {
    const nextErrors: PurchaseFormErrors = {};

    if (!formData.supplier_id) {
      nextErrors.supplier_id = "Seleccione un proveedor";
    }

    if (!formData.warehouse_id) {
      nextErrors.warehouse_id = "Seleccione una bodega";
    }

    if (!formData.expected_delivery_date) {
      nextErrors.expected_delivery_date = "Indique la fecha esperada";
    }

    if (formData.payment_condition === "CREDIT" && !formData.payment_due_date) {
      nextErrors.payment_due_date =
        "Indique la fecha límite de pago para órdenes a crédito";
    }

    const validItems = formData.items.filter(
      (item) => item.product_variant_id && Number(item.quantity_ordered) > 0,
    );

    if (validItems.length === 0) {
      nextErrors.items =
        "Agregue al menos un item completo con producto y cantidad";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: CreatePurchaseOrderRequest = {
        supplier_id: formData.supplier_id,
        warehouse_id: formData.warehouse_id,
        expected_delivery_date: formData.expected_delivery_date,
        has_invoice: formData.has_invoice,
        payment_condition: formData.payment_condition,
        payment_due_date:
          formData.payment_condition === "CREDIT"
            ? formData.payment_due_date
            : undefined,
        items: formData.items
          .filter(
            (item) => item.product_variant_id && Number(item.quantity_ordered) > 0,
          )
          .map(
            (item): CreatePurchaseOrderItemRequest => ({
              product_variant_id: item.product_variant_id,
              quantity_ordered: Number(item.quantity_ordered),
            }),
          ),
      };

      const created = await purchaseApi.createOrder(payload);
      setOrders((prev) => [created, ...prev]);
      resetCreateModal();
      setToast({ mode: "success", message: "Orden de compra creada" });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear la orden de compra",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseItemFormRow,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const items = prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: String(value) } : item,
      );
      return { ...prev, items };
    });
  };

  const handleProductSelect = (
    index: number,
    selection: ProductVariantSelection,
  ) => {
    // El costo unitario ya no se captura aqui: create_purchase_order() lo
    // resuelve server-side desde general_schema.product_variant.cost_price
    // (USD) al crear la orden.
    setFormData((prev) => {
      const items = prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              product_variant_id: selection.product_variant_id,
              variant_name: selection.variant_name,
              sku: selection.sku,
            }
          : item,
      );
      return { ...prev, items };
    });
  };

  const handleProductClear = (index: number) => {
    setFormData((prev) => {
      const items = prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...emptyItem } : item,
      );
      return { ...prev, items };
    });
  };

  const handleRegisterPayment = async (
    payload: CreatePurchasePaymentRequest,
  ) => {
    const result = await purchaseApi.registerPayment(payload);
    // Refresh the open detail and the row in the table.
    setSelectedOrder(result.order);
    updateOrderRow(result.order);
    setToast({
      mode: "success",
      message: "Abono registrado correctamente",
    });
  };

  const handleUpdatePayment = async (
    paymentId: string,
    payload: Partial<CreatePurchasePaymentRequest>,
  ) => {
    const result = await purchaseApi.updatePayment(paymentId, payload);
    setSelectedOrder(result.order);
    updateOrderRow(result.order);
    setToast({
      mode: "success",
      message: "Abono actualizado correctamente",
    });
  };

  const handleStatusUpdate = async (order: PurchaseOrder, statusId: number) => {
    try {
      const updated = await purchaseApi.updateOrderStatus(
        order.purchase_order_id,
        statusId,
      );
      updateOrderRow(updated);

      if (selectedOrder?.purchase_order_id === updated.purchase_order_id) {
        setSelectedOrder(updated);
        const matching = await purchaseApi.getMatching(
          updated.purchase_order_id,
        );
        setSelectedMatching(matching);
      }

      setToast({
        mode: "success",
        message:
          updated.message ??
          `Estado actualizado a ${updated.purchase_order_status_name}`,
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el estado",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <section className="mb-6 rounded-4xl border border-amber-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_36%),linear-gradient(135deg,rgba(255,251,235,1),rgba(255,255,255,1)_58%,rgba(255,247,237,1))] p-6 shadow-[0_18px_40px_-24px_rgba(146,64,14,0.32)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Supply Chain
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Compras
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Cree órdenes de compra siguiendo el flujo documentado del módulo y
              rastree su avance desde pendiente hasta entrega y conciliación.
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Contexto de creación
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {currentTenantName}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr] xl:grid-cols-4">
        <StatCard
          label="Órdenes visibles"
          value={String(stats.total)}
          sublabel="Según filtros activos"
          icon={<IconShoppingCart />}
          accent
        />
        <StatCard
          label="Pendientes"
          value={String(stats.pending)}
          sublabel="Aún no despachadas"
          icon={<IconCalendar />}
        />
        <StatCard
          label="Entregadas"
          value={String(stats.delivered)}
          sublabel="Con recepción completada"
          icon={<IconCheckCircle />}
        />
        <StatCard
          label="Pendiente por pagar"
          value={formatCurrency(stats.outstanding)}
          sublabel="Saldo vivo de las órdenes filtradas"
          icon={<IconPackage />}
        />
      </section>

      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 lg:flex-row">
            <Input
              label="Buscar orden"
              placeholder="Buscar por ID, proveedor, bodega o tenant"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full lg:max-w-md"
            />

            {isSuperuser && (
              <Select
                label="Filtrar tenant"
                value={tenantFilter}
                onChange={(event) => setTenantFilter(event.target.value)}
                options={[
                  { value: "all", label: "Todos los tenants" },
                  ...tenantOptions,
                ]}
                className="w-full lg:max-w-xs"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filteredOrders.length} orden
              {filteredOrders.length === 1 ? "" : "es"}
            </span>
            {canManage && (
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                <IconPlus />
                Nueva orden
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <Table
          columns={[
            {
              key: "purchase_order_id",
              label: "Orden",
              width: "15%",
              render: (value) => (
                <span className="font-mono text-xs text-gray-500">
                  {String(value).slice(0, 8)}…
                </span>
              ),
            },
            { key: "supplier_name", label: "Proveedor", width: "16%" },
            {
              key: "purchase_order_status_name",
              label: "Estado",
              width: "12%",
              render: (value) => (
                <Badge variant={getOrderStatusTone(String(value))}>
                  {String(value)}
                </Badge>
              ),
            },
            {
              key: "account_payable_status_name",
              label: "CxP",
              width: "12%",
              render: (value) =>
                value ? (
                  <Badge variant={getPayableStatusTone(String(value))}>
                    {String(value)}
                  </Badge>
                ) : (
                  "—"
                ),
            },
            {
              key: "total_amount",
              label: "Total",
              width: "12%",
              render: (value) => formatCurrency(value as number | string),
            },
            {
              key: "balance_due",
              label: "Pendiente",
              width: "12%",
              render: (value) => formatCurrency(value as number | string),
            },
            {
              key: "expected_delivery_date",
              label: "Entrega",
              width: "11%",
              render: (value) => formatDate(String(value)),
            },
            ...(isSuperuser
              ? [
                  {
                    key: "tenant_name",
                    label: "Tenant",
                    width: "12%",
                  },
                ]
              : []),
            {
              key: "actions",
              label: "Acciones",
              width: isSuperuser ? "18%" : "20%",
              render: (_value, order: PurchaseOrder) => (
                <div
                  className="flex flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    title="Ver detalle"
                    onClick={() => openDetail(order.purchase_order_id)}
                  >
                    <IconEye />
                  </Button>

                  {canManage &&
                    getNextOrderStatuses(order.purchase_order_status_id).map(
                      (statusId) => (
                        <Button
                          key={`${order.purchase_order_id}-${statusId}`}
                          size="sm"
                          variant={statusId === 4 ? "warning" : "secondary"}
                          onClick={() => handleStatusUpdate(order, statusId)}
                        >
                          {getStatusLabelById(statusId)}
                        </Button>
                      ),
                    )}
                </div>
              ),
            },
          ]}
          data={filteredOrders}
          emptyMessage="No hay órdenes de compra para mostrar"
          onRowClick={(order) =>
            openDetail((order as PurchaseOrder).purchase_order_id)
          }
        />
      </section>

      <Modal
        isOpen={isCreateOpen}
        onClose={resetCreateModal}
        title="Nueva orden de compra"
        size="lg"
      >
        <form className="space-y-6" onSubmit={handleCreateOrder}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Proveedor"
              value={formData.supplier_id}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  supplier_id: event.target.value,
                }))
              }
              options={supplierOptions}
              placeholder="Seleccionar proveedor"
              error={formErrors.supplier_id}
              required
            />

            <Select
              label="Bodega de destino"
              value={formData.warehouse_id}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  warehouse_id: event.target.value,
                }))
              }
              options={warehouseOptions}
              placeholder="Seleccionar bodega"
              error={formErrors.warehouse_id}
              required
            />

            <Input
              label="Fecha esperada de entrega"
              type="date"
              value={formData.expected_delivery_date}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  expected_delivery_date: event.target.value,
                }))
              }
              error={formErrors.expected_delivery_date}
              required
            />

            <Select
              label="Condición de pago"
              value={formData.payment_condition}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  payment_condition: event.target.value as "CREDIT" | "IN_FULL",
                }))
              }
              options={catalogs.payment_conditions}
              required
            />

            {formData.payment_condition === "CREDIT" && (
              <Input
                label="Fecha límite de pago"
                type="date"
                value={formData.payment_due_date}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    payment_due_date: event.target.value,
                  }))
                }
                error={formErrors.payment_due_date}
                required
              />
            )}
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-amber-50 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.has_invoice}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  has_invoice: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            Generar factura del proveedor junto con la orden
          </label>

          <section className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Items de la orden
                </h3>
                <p className="text-xs text-gray-500">
                  Agregue producto, cantidad y costo unitario para cada línea.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    items: [...prev.items, { ...emptyItem }],
                  }))
                }
              >
                <IconPlus />
                Agregar producto
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {formData.items.map((item, index) => (
                <div
                  key={`purchase-item-${index}`}
                  className="grid gap-3 rounded-2xl border border-white bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:grid-cols-[1.8fr_0.8fr_auto]"
                >
                  <ProductVariantComboBox
                    tenantId={user?.tenant.tenant_id || ""}
                    value={item.product_variant_id}
                    displayValue={
                      item.sku
                        ? `${item.variant_name} (${item.sku})`
                        : item.variant_name
                    }
                    onChange={(selection) =>
                      handleProductSelect(index, selection)
                    }
                    onClear={() => handleProductClear(index)}
                    label={`Producto ${index + 1}`}
                    placeholder="Buscar por SKU o nombre"
                    required
                  />

                  <Input
                    label="Cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity_ordered}
                    onChange={(event) =>
                      handleItemChange(
                        index,
                        "quantity_ordered",
                        event.target.value,
                      )
                    }
                    required
                  />

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          items:
                            prev.items.length === 1
                              ? prev.items
                              : prev.items.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                        }))
                      }
                      disabled={formData.items.length === 1}
                    >
                      <IconX />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {formErrors.items && (
              <p className="mt-3 text-xs text-red-500">{formErrors.items}</p>
            )}
          </section>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Resumen rápido
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SummaryMetric
                label="Líneas válidas"
                value={String(
                  formData.items.filter(
                    (item) =>
                      item.product_variant_id &&
                      Number(item.quantity_ordered) > 0,
                  ).length,
                )}
              />
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Costo e impuesto
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Se calculan al confirmar, tomando el costo (USD) configurado
                  para cada producto en el módulo General.
                </p>
              </div>
            </div>
          </div>

          {isSuperuser && (
            <p className="text-xs text-gray-500">
              La creación de órdenes se realiza con el tenant activo de la
              sesión:{" "}
              <span className="font-medium text-gray-700">
                {currentTenantName}
              </span>
              .
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={resetCreateModal}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Crear orden
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOrder(null);
          setSelectedMatching(null);
        }}
        title="Detalle de la orden"
        size="lg"
      >
        {isDetailLoading || !selectedOrder ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-3xl bg-gray-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-gray-100" />
          </div>
        ) : (
          <PurchaseOrderDetailPanel
            order={selectedOrder}
            matching={selectedMatching}
            showTenant={isSuperuser}
            paymentMethods={canManage ? catalogs.payment_methods : undefined}
            onRegisterPayment={canManage ? handleRegisterPayment : undefined}
            onUpdatePayment={canManage ? handleUpdatePayment : undefined}
          />
        )}
      </Modal>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
