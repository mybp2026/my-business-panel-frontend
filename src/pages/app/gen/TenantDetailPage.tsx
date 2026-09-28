import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { tenantApi } from "../../../api/tenant.api";
import { branchApi } from "../../../api/branch.api";
import { userApi } from "../../../api/user.api";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { Table, Pagination } from "../../../components/ui/Table";
import { Badge } from "../../../components/ui/Badge";
import { PageHeaderBanner } from "../../../components/layout/PageHeaderBanner";
import { useTableQuery } from "../../../hooks/useTableQuery";
import type { Tenant } from "../../../interfaces/entities/Tenant.interface";
import type { Branch } from "../../../interfaces/entities/Branch.interface";
import type { User } from "../../../interfaces/entities/User.interface";

interface BranchFormState {
  branch_name: string;
  branch_number: string;
  branch_address: string;
  is_main_branch: boolean;
}

interface BranchFormErrors {
  branch_name?: string;
  branch_number?: string;
  is_main_branch?: string;
}

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Tenant data
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const {
    page: branchPage,
    limit: branchLimit,
    setPage: setBranchPage,
    handleLimitChange: handleBranchLimitChange,
  } = useTableQuery({ initialLimit: 20 });
  const [branchTotal, setBranchTotal] = useState(0);
  const [branchTotalPages, setBranchTotalPages] = useState(1);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const {
    page: userPage,
    limit: userLimit,
    setPage: setUserPage,
    handleLimitChange: handleUserLimitChange,
  } = useTableQuery({ initialLimit: 10 });
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);

  // Branch modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(
    null,
  );
  const [branchErrors, setBranchErrors] = useState<BranchFormErrors>({});
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const branchFormRef = useRef<HTMLFormElement>(null);

  const initialBranchState: BranchFormState = {
    branch_name: "",
    branch_number: "",
    branch_address: "",
    is_main_branch: false,
  };
  const [branchFormData, setBranchFormData] =
    useState<BranchFormState>(initialBranchState);

  // Verify user is admin nivel 1
  if (!currentUser || currentUser.role.role_hierarchy !== 1) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-red-900 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-red-700">
            Solo los administradores nivel 1 pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  // Load tenant details
  useEffect(() => {
    const loadTenant = async () => {
      if (!tenantId) return;
      try {
        const data = await tenantApi.getById(tenantId);
        setTenant(data);
      } catch (error) {
        console.error("Error loading tenant:", error);
        navigate("/app/tenants");
      } finally {
        setIsLoadingTenant(false);
      }
    };

    loadTenant();
  }, [tenantId, navigate]);

  // Load branches
  const loadBranches = async (pageNum = 1, limitNum = branchLimit) => {
    if (!tenantId) return;
    setIsLoadingBranches(true);
    try {
      const result = await branchApi.listByTenant(tenantId, pageNum, limitNum);
      setBranches(result.branches);
      setBranchTotal(result.total);
      setBranchTotalPages(Math.max(1, Math.ceil(result.total / result.limit)));
      setBranchPage(result.page);
    } catch (error) {
      console.error("Error loading branches:", error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Load users of tenant
  const loadUsers = async (pageNum = 1, limitNum = userLimit) => {
    if (!tenantId) return;
    setIsLoadingUsers(true);
    try {
      const result = await userApi.listByTenant(tenantId, pageNum, limitNum);
      setUsers(result.users);
      setUserTotal(result.total);
      setUserTotalPages(Math.max(1, Math.ceil(result.total / result.limit)));
      setUserPage(result.page);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadBranches(1, branchLimit);
    loadUsers(1, userLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Branch form validation
  const validateBranchForm = (): boolean => {
    const errors: BranchFormErrors = {};

    if (!branchFormData.branch_name.trim()) {
      errors.branch_name = "Nombre de sucursal es requerido";
    }

    if (!branchFormData.branch_number.trim()) {
      errors.branch_number = "Número de sucursal es requerido";
    }

    setBranchErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit branch form
  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateBranchForm() || !tenantId) {
      return;
    }

    setIsSubmittingBranch(true);
    try {
      if (editingBranch) {
        // Update branch
        await branchApi.update(editingBranch.branch_id, {
          branch_name: branchFormData.branch_name,
          branch_address: branchFormData.branch_address,
          is_main_branch: branchFormData.is_main_branch,
        });
      } else {
        // Create branch
        await branchApi.create({
          tenant_id: tenantId,
          branch_name: branchFormData.branch_name,
          branch_number: branchFormData.branch_number,
          branch_address: branchFormData.branch_address,
          is_main_branch: branchFormData.is_main_branch,
        });
      }

      await loadBranches(branchPage);
      setIsBranchModalOpen(false);
      setEditingBranch(null);
      setBranchFormData(initialBranchState);
      setBranchErrors({});
    } catch (error) {
      console.error("Error saving branch:", error);
      setBranchErrors({
        branch_name:
          error instanceof Error ? error.message : "Error saving branch",
      });
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  // Open branch modal for new
  const handleNewBranch = () => {
    setEditingBranch(null);
    setBranchFormData(initialBranchState);
    setBranchErrors({});
    setIsBranchModalOpen(true);
  };

  // Open branch modal for edit
  const handleEditBranch = (branchToEdit: Branch) => {
    setEditingBranch(branchToEdit);
    setBranchFormData({
      branch_name: branchToEdit.branch_name,
      branch_number: branchToEdit.branch_number,
      branch_address: branchToEdit.branch_address,
      is_main_branch: branchToEdit.is_main_branch,
    });
    setBranchErrors({});
    setIsBranchModalOpen(true);
  };

  // Delete branch
  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar esta sucursal?")) {
      return;
    }

    try {
      await branchApi.delete(branchId);
      await loadBranches(branchPage);
    } catch (error) {
      console.error("Error deleting branch:", error);
    }
  };

  if (isLoadingTenant) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-red-900 mb-2">
            Tenant no encontrado
          </h2>
          <Button
            variant="primary"
            onClick={() => navigate("/app/tenants")}
            className="mt-4"
          >
            Volver a Tenants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/app/tenants")}
          className="text-accent-600 hover:text-accent-700 text-sm font-medium mb-4 flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
      </div>
      <PageHeaderBanner
        eyebrow="General"
        title={tenant.tenant_name}
        description={`ID: ${tenant.tenant_id}`}
      />

      {/* Tenant Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Email
          </p>
          <p className="text-sm font-medium text-gray-900">
            {tenant.contact_email}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Identificación
          </p>
          <p className="text-sm font-medium text-gray-900">
            {tenant.identification}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Suscripción
          </p>
          <Badge variant={tenant.is_subscribed ? "success" : "secondary"}>
            {tenant.is_subscribed ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Régimen Fiscal
          </p>
          <p className="text-sm font-medium text-gray-900 capitalize">
            {tenant.tax_regime}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Branches Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Sucursales</h2>
              <Button variant="primary" size="sm" onClick={handleNewBranch}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nueva
              </Button>
            </div>

            <Table
              columns={[
                { key: "branch_name", label: "Nombre", width: "35%" },
                { key: "branch_number", label: "Número", width: "25%" },
                {
                  key: "is_main_branch",
                  label: "Principal",
                  width: "15%",
                  render: (isMain) => (
                    <Badge variant={isMain ? "success" : "secondary"}>
                      {isMain ? "Sí" : "No"}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  label: "Acciones",
                  width: "25%",
                  render: (_, row) => (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBranch(row)}
                        className="px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(row.branch_id)}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  ),
                },
              ]}
              data={branches}
              isLoading={isLoadingBranches}
              emptyMessage="No hay sucursales registradas"
            />

            {branchTotalPages > 1 && (
              <Pagination
                page={branchPage}
                totalPages={branchTotalPages}
                onPageChange={(newPage) => {
                  setBranchPage(newPage);
                  loadBranches(newPage, branchLimit);
                }}
                loading={isLoadingBranches}
                limit={branchLimit}
                onLimitChange={(newLimit) => {
                  handleBranchLimitChange(newLimit);
                  loadBranches(1, newLimit);
                }}
                total={branchTotal}
              />
            )}
          </div>
        </div>

        {/* Users Section */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Usuarios del Tenant
            </h2>

            <div className="space-y-2">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-3 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
                </div>
              ) : users.length > 0 ? (
                <>
                  {users.map((u) => (
                    <div
                      key={u.user_id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {u.email}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {u.role?.role_name || `Role ${u.role_id}`}
                      </Badge>
                    </div>
                  ))}
                  {userTotalPages > 1 && (
                    <Pagination
                      page={userPage}
                      totalPages={userTotalPages}
                      onPageChange={(newPage) => {
                        setUserPage(newPage);
                        loadUsers(newPage, userLimit);
                      }}
                      loading={isLoadingUsers}
                      limit={userLimit}
                      onLimitChange={(newLimit) => {
                        handleUserLimitChange(newLimit);
                        loadUsers(1, newLimit);
                      }}
                      total={userTotal}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay usuarios
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Branch Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => {
          setIsBranchModalOpen(false);
          setEditingBranch(null);
          setBranchFormData(initialBranchState);
          setBranchErrors({});
        }}
        title={editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
        size="md"
      >
        <form
          ref={branchFormRef}
          onSubmit={handleBranchSubmit}
          className="space-y-4"
        >
          <Input
            label="Nombre"
            placeholder="Ej: Sede Central"
            value={branchFormData.branch_name}
            onChange={(e) =>
              setBranchFormData((prev) => ({
                ...prev,
                branch_name: e.target.value,
              }))
            }
            error={branchErrors.branch_name}
            required
          />

          <Input
            label="Número de Sucursal"
            placeholder="Ej: 001"
            value={branchFormData.branch_number}
            onChange={(e) =>
              setBranchFormData((prev) => ({
                ...prev,
                branch_number: e.target.value,
              }))
            }
            error={branchErrors.branch_number}
            required={!editingBranch}
            disabled={!!editingBranch}
          />

          <Input
            label="Dirección"
            placeholder="Dirección completa"
            value={branchFormData.branch_address}
            onChange={(e) =>
              setBranchFormData((prev) => ({
                ...prev,
                branch_address: e.target.value,
              }))
            }
          />

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_main"
              checked={branchFormData.is_main_branch}
              onChange={(e) =>
                setBranchFormData((prev) => ({
                  ...prev,
                  is_main_branch: e.target.checked,
                }))
              }
              className="rounded border-gray-300"
            />
            <label
              htmlFor="is_main"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Esta es la sucursal principal
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsBranchModalOpen(false);
                setEditingBranch(null);
                setBranchFormData(initialBranchState);
                setBranchErrors({});
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmittingBranch}
            >
              {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
