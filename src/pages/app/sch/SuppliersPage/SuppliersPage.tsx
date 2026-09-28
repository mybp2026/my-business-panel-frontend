import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import { IconEdit, IconPlus, IconTrash } from "@/assets/icons";

import { purchaseApi } from "@/api/purchase.api";

import type { CreateSupplierRequest } from "@/interfaces/api/requests/PurchaseModuleRequests.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { Supplier } from "@/interfaces/entities/Purchase.interface";
import type { SuppliersPageLoaderData } from "@/router/loaders/purchase.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

const emptyForm: CreateSupplierRequest = {
  supplier_name: "",
  supplier_contact_info: "",
  supplier_address: "",
  supplier_notes: "",
};

type SupplierErrors = Partial<Record<keyof CreateSupplierRequest, string>>;

export function SuppliersPage() {
  const { data } = useLoaderData() as { data: Promise<SuppliersPageLoaderData> };

  return (
    <DeferredPage resolve={data}>
      {(resolved) => <SuppliersPageContent {...resolved} />}
    </DeferredPage>
  );
}

function SuppliersPageContent({
  suppliers: initialSuppliers,
  currentTenantName,
}: SuppliersPageLoaderData) {
  const { user } = useAuth();

  const canManage = user?.role.role_id === 1 || user?.role.role_id === 2;

  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierRequest>(emptyForm);
  const [errors, setErrors] = useState<SupplierErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suppliers;

    return suppliers.filter(
      (supplier) =>
        supplier.supplier_id.toLowerCase().includes(query) ||
        supplier.supplier_name.toLowerCase().includes(query),
    );
  }, [search, suppliers]);

  const validate = () => {
    const nextErrors: SupplierErrors = {};

    if (!formData.supplier_name.trim()) {
      nextErrors.supplier_name = "El nombre del proveedor es obligatorio";
    }

    if (!formData.supplier_contact_info.trim()) {
      nextErrors.supplier_contact_info = "El contacto es obligatorio";
    }

    if (!formData.supplier_address.trim()) {
      nextErrors.supplier_address = "La dirección es obligatoria";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData(emptyForm);
    setErrors({});
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setFormData(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name,
      supplier_contact_info: supplier.supplier_contact_info,
      supplier_address: supplier.supplier_address,
      supplier_notes: supplier.supplier_notes ?? "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        const response = await purchaseApi.updateSupplier(
          editingSupplier.supplier_id,
          formData,
        );

        setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.supplier_id === editingSupplier.supplier_id
              ? response.supplier
              : supplier,
          ),
        );
        setToast({ mode: "success", message: "Proveedor actualizado" });
      } else {
        const created = await purchaseApi.createSupplier(formData);
        setSuppliers((prev) => [created, ...prev]);
        setToast({ mode: "success", message: "Proveedor creado" });
      }

      resetModal();
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "No se pudo guardar el proveedor",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (
      !confirm(
        `¿Eliminar a "${supplier.supplier_name}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    const snapshot = suppliers;
    setSuppliers((prev) =>
      prev.filter((item) => item.supplier_id !== supplier.supplier_id),
    );

    try {
      await purchaseApi.deleteSupplier(supplier.supplier_id);
      setToast({ mode: "success", message: "Proveedor eliminado" });
    } catch (error) {
      setSuppliers(snapshot);
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el proveedor",
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

      <PageHeaderBanner
        eyebrow="Supply Chain"
        title="Proveedores"
        description="Mantenga el padrón de proveedores del tenant activo y deje listo el catálogo que se usará al crear órdenes de compra."
      >
        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Contexto actual
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {currentTenantName}
          </p>
        </div>
      </PageHeaderBanner>

      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <Input
              label="Buscar proveedor"
              placeholder="Buscar por ID o nombre"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full lg:max-w-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filtered.length} registro{filtered.length === 1 ? "" : "s"}
            </span>
            {canManage && (
              <Button variant="primary" onClick={openCreate}>
                <IconPlus />
                Nuevo proveedor
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <Table
          columns={[
            { key: "supplier_name", label: "Proveedor", width: "22%" },
            {
              key: "supplier_contact_info",
              label: "Contacto",
              width: "26%",
            },
            { key: "supplier_address", label: "Dirección", width: "32%" },
            {
              key: "created_at",
              label: "Creado",
              width: "10%",
              render: (value) =>
                value
                  ? new Date(String(value)).toLocaleDateString("es-CR")
                  : "—",
            },
            {
              key: "actions",
              label: "Acciones",
              width: "10%",
              render: (_value, supplier: Supplier) =>
                canManage ? (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      title="Editar proveedor"
                      onClick={() => openEdit(supplier)}
                    >
                      <IconEdit />
                    </Button>
                    <Button
                      variant="danger"
                      title="Eliminar proveedor"
                      onClick={() => handleDelete(supplier)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                ) : null,
            },
          ]}
          data={filtered}
          emptyMessage="No hay proveedores registrados todavía"
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={resetModal}
        title={editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nombre del proveedor"
            value={formData.supplier_name}
            error={errors.supplier_name}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                supplier_name: event.target.value,
              }))
            }
            required
          />

          <Input
            label="Contacto"
            value={formData.supplier_contact_info}
            error={errors.supplier_contact_info}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                supplier_contact_info: event.target.value,
              }))
            }
            hint="Puede incluir correo, teléfono o ambos."
            required
          />

          <Input
            label="Dirección"
            value={formData.supplier_address}
            error={errors.supplier_address}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                supplier_address: event.target.value,
              }))
            }
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Notas
              <span className="ml-1 text-xs font-normal text-gray-400">
                (opcional)
              </span>
            </label>
            <textarea
              value={formData.supplier_notes ?? ""}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  supplier_notes: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-150 hover:border-gray-300 focus-ring-accent"
              placeholder="Condiciones especiales, observaciones o historial útil para compras."
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={resetModal}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingSupplier ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
