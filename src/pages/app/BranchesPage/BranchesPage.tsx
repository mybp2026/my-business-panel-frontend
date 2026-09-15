import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import {
  createBranch,
  updateBranch,
  deleteBranch,
} from "@/router/actions/branch.actions";

import type { BranchesPageLoaderData } from "@/router/loaders/branch.loaders";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/assets/icons";

import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { UpdateBranchRequest } from "@/interfaces/api/requests/UpdateBranchRequest.interface";
import type { NewBranchRequest } from "@/interfaces/api/requests/NewBranchRequest.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { BranchDetailModal } from "./BranchDetailModal";
import { BranchUpsertModal } from "./BranchUpsertModal";

const LIMIT = 100;

// ─── Form state ───────────────────────────────────────────────────────────────

interface BranchFormState {
  branch_name: string;
  branch_number: string;
  branch_address: string;
  is_main_branch: boolean;
  tenant_id?: string;
}

interface BranchFormErrors {
  branch_name?: string;
  branch_number?: string;
  tenant_id?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BranchesPage() {
  const { initialBranches, tenants } =
    useLoaderData() as BranchesPageLoaderData;
  const { user: currentUser } = useAuth();

  const isSuperAdmin = currentUser?.role.role_id === 1;
  const canManageBranches =
    currentUser?.role.role_id === 1 || currentUser?.role.role_id === 2;

  const [branches, setBranches] = useState<Branch[]>(
    initialBranches?.branches ?? [],
  );
  const [page, setPage] = useState(initialBranches?.page ?? 1);
  const [totalPages] = useState(
    Math.ceil(
      (initialBranches?.total ?? 0) / (initialBranches?.limit ?? LIMIT),
    ),
  );
  const [total, setTotal] = useState(initialBranches?.total ?? 0);

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formErrors, setFormErrors] = useState<BranchFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const initialFormState: BranchFormState = {
    branch_name: "",
    branch_number: "",
    branch_address: "",
    is_main_branch: false,
    tenant_id: undefined,
  };
  const [formData, setFormData] = useState<BranchFormState>(initialFormState);

  const validateForm = (): boolean => {
    const errors: BranchFormErrors = {};
    if (!formData.branch_name.trim())
      errors.branch_name = "Nombre de sucursal es requerido";
    if (!editingBranch && !formData.branch_number.trim())
      errors.branch_number = "Número de sucursal es requerido";
    if (isSuperAdmin && !editingBranch && !formData.tenant_id)
      errors.tenant_id = "Empresa (Tenant) es requerida";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateBranch = async (data: NewBranchRequest) => {
    const tempId = `temp-${Date.now()}`;
    const tempBranch: Branch = {
      branch_id: tempId,
      branch_name: data.branch_name,
      branch_number: data.branch_number,
      branch_address: data.branch_address ?? "",
      is_main_branch: data.is_main_branch,
      tenant_id: data.tenant_id,
    };

    setBranches((prev) => [tempBranch, ...prev]);
    setTotal((prev) => prev + 1);

    try {
      const result = await createBranch(data);
      setBranches((prev) =>
        prev.map((b) => (b.branch_id === tempId ? result : b)),
      );
      setToast({ mode: "success", message: "Sucursal creada exitosamente" });
    } catch (error) {
      setBranches((prev) => prev.filter((b) => b.branch_id !== tempId));
      setTotal((prev) => prev - 1);
      const message =
        error instanceof Error ? error.message : "Error al crear sucursal";
      setToast({ mode: "error", message });
    }
  };

  const handleUpdateBranch = async (
    branchId: string,
    data: UpdateBranchRequest,
  ) => {
    try {
      const updated = await updateBranch(branchId, data);
      setBranches((prev) =>
        prev.map((b) => {
          if (b.branch_id === branchId) return { ...b, ...updated };
          if (updated.is_main_branch) return { ...b, is_main_branch: false };
          return b;
        }),
      );
      setToast({
        mode: "success",
        message: "Sucursal actualizada exitosamente",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al actualizar sucursal";
      setToast({ mode: "error", message });
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    const branchToDelete = branches.find((b) => b.branch_id === branchId);

    if (branchToDelete?.is_main_branch) {
      setToast({
        mode: "error",
        message:
          "No se puede eliminar la sucursal principal. Desmárcala primero.",
      });
      return;
    }

    if (!confirm("¿Está seguro de que desea eliminar esta sucursal?")) return;
    setBranches((prev) => prev.filter((b) => b.branch_id !== branchId));
    setTotal((prev) => prev - 1);
    try {
      await deleteBranch(branchId);
      setToast({ mode: "success", message: "Sucursal eliminada exitosamente" });
    } catch (error) {
      if (branchToDelete) {
        setBranches((prev) => [...prev, branchToDelete]);
        setTotal((prev) => prev + 1);
      }
      const message =
        error instanceof Error ? error.message : "Error al eliminar sucursal";
      setToast({ mode: "error", message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    if (editingBranch) {
      await handleUpdateBranch(editingBranch.branch_id, {
        branch_name: formData.branch_name,
        branch_address: formData.branch_address,
        is_main_branch: formData.is_main_branch,
      });
    } else {
      const tenantId = isSuperAdmin
        ? formData.tenant_id || ""
        : currentUser?.tenant.tenant_id || "";
      await handleCreateBranch({
        tenant_id: tenantId,
        branch_name: formData.branch_name,
        branch_number: formData.branch_number,
        branch_address: formData.branch_address,
        is_main_branch: formData.is_main_branch,
      });
    }

    closeModal();
    setIsSubmitting(false);
  };

  const handleEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setFormData({
      branch_name: b.branch_name,
      branch_number: b.branch_number,
      branch_address: b.branch_address,
      is_main_branch: b.is_main_branch,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setFormData(initialFormState);
    setFormErrors({});
  };

  const sortedBranches = [...branches].sort((a, b) => {
    if (a.is_main_branch && !b.is_main_branch) return -1;
    if (!a.is_main_branch && b.is_main_branch) return 1;
    return (
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime()
    );
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Toast */}
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
          Gestión de Sucursales
        </h1>
        <p className="text-gray-600">
          {isSuperAdmin
            ? "Sucursales de todos los tenants"
            : `Administra las sucursales de ${currentUser?.tenant.tenant_name}`}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <Input
              label="Buscar sucursal"
              placeholder="Buscar por nombre de sucursal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:max-w-sm"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {total} sucursal{total !== 1 ? "es" : ""}
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              className="w-full lg:w-auto"
            >
              <IconPlus />
              Nueva Sucursal
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          columns={[
            { key: "branch_name", label: "Nombre", width: "25%" },
            { key: "branch_number", label: "Número", width: "10%" },
            ...(isSuperAdmin
              ? [
                  {
                    key: "tenant_id" as keyof Branch,
                    label: "Tenant",
                    width: "18%",
                    render: (_: unknown, row: Branch) => row.tenant_id,
                  },
                ]
              : []),
            {
              key: "is_main_branch" as keyof Branch,
              label: "Principal",
              width: "12%",
              render: (isMain: unknown) => (
                <Badge variant={(isMain as boolean) ? "success" : "secondary"}>
                  {(isMain as boolean) ? "Sí" : "No"}
                </Badge>
              ),
            },
            {
              key: "created_at",
              label: "Creado",
              width: isSuperAdmin ? "20%" : "30%",
              render: (date) => new Date(date).toLocaleDateString("es-CR"),
            },
            ...(canManageBranches
              ? [
                  {
                    key: "actions" as keyof Branch,
                    label: "Acciones",
                    width: "10%",
                    render: (_: unknown, row: Branch) => (
                      <div
                        className="flex gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          onClick={() => setSelectedBranch(row)}
                          title="Ver detalles"
                          variant="ghost"
                          className="hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <IconEye />
                        </Button>
                        <Button
                          onClick={() => handleEditBranch(row)}
                          title="Editar sucursal"
                          variant="ghost"
                          className="hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <IconEdit />
                        </Button>
                        <Button
                          onClick={() => handleDeleteBranch(row.branch_id)}
                          title="Eliminar sucursal"
                          variant="danger"
                          className="hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          data={sortedBranches}
          emptyMessage="No hay sucursales registradas"
        />
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              setPage(p);
            }}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedBranch && (
        <BranchDetailModal
          branch={selectedBranch}
          onClose={() => setSelectedBranch(null)}
        />
      )}

      <BranchUpsertModal
        isOpen={isModalOpen}
        isSuperAdmin={isSuperAdmin}
        isEditing={!!editingBranch}
        formData={formData}
        formErrors={formErrors}
        tenants={tenants}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={setFormData}
      />
    </div>
  );
}
