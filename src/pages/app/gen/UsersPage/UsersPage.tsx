import { useEffect, useState, useRef } from "react";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import { userApi } from "@/api/user.api";
import { useTableQuery } from "@/hooks/useTableQuery";
import {
  createUser,
  deleteUser,
  updateUser,
} from "@/router/actions/user.actions";
import type { UsersPageLoaderData } from "@/router/loaders/user.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/assets/icons";

import type { User } from "@/interfaces/entities/User.interface";
import type { Role } from "@/interfaces/entities/Role.interface";
import type { CreateUserRequest } from "@/interfaces/api/requests/CreateUserRequest.interface";
import type { UpdateUserRequest } from "@/interfaces/api/requests/UpdateUserRequest.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { UserDetailModal } from "./UserDetailModal";
import { UserUpsertModal } from "./UserUpsertModal";

import { getRoleName } from "@/utils/getRoleName";

const LIMIT = 100;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { data } = useLoaderData() as { data: Promise<UsersPageLoaderData> };

  return (
    <DeferredPage resolve={data}>
      {({ initialUsers }) => <UsersPageContent initialUsers={initialUsers} />}
    </DeferredPage>
  );
}

function UsersPageContent({ initialUsers }: UsersPageLoaderData) {
  const { user: currentUser } = useAuth();
  const canManageUsers =
    currentUser?.role.role_id === 1 || currentUser?.role.role_id === 2;

  const [users, setUsers] = useState<User[]>(initialUsers?.users ?? []),
    [roles, setRoles] = useState<Role[]>([]),
    [isLoadingRoles, setIsLoadingRoles] = useState(true),
    [searchQuery, setSearchQuery] = useState(""),
    [total, setTotal] = useState(initialUsers?.total ?? 0),
    [isModalOpen, setIsModalOpen] = useState(false),
    [selectedUser, setSelectedUser] = useState<User | null>(null),
    [editingUser, setEditingUser] = useState<User | null>(null);

  const { page, limit, setPage, handleLimitChange } = useTableQuery({
    initialPage: initialUsers?.page ?? 1,
    initialLimit: initialUsers?.limit ?? LIMIT,
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formRef = useRef<HTMLFormElement>(null);

  // Toast
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const tenantId = currentUser?.tenant.tenant_id ?? "";
  const isUpsertOpen = isModalOpen || !!editingUser;
  const isEditing = !!editingUser;

  useEffect(() => {
    userApi
      .getRoles()
      .then(setRoles)
      .catch(console.error)
      .finally(() => setIsLoadingRoles(false));
  }, []);

  // ─── Re-fetch al cambiar de página o límite ───────────────────────────────
  useEffect(() => {
    if (
      page === (initialUsers?.page ?? 1) &&
      limit === (initialUsers?.limit ?? LIMIT)
    ) {
      return;
    }
    if (!tenantId) return;
    let cancelled = false;
    userApi
      .listByTenant(tenantId, page, limit)
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users);
        setTotal(data.total);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Error al cargar usuarios";
        setToast({ mode: "error", message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, tenantId]);

  const handleCreateUser = async (data: CreateUserRequest) => {
    const tempId = `temp-${Date.now()}`;
    const tempUser: User = {
      user_id: tempId,
      email: data.email,
      role_id: data.role_id,
      tenant_id: data.tenant_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUsers((prev) => [tempUser, ...prev]);
    setTotal((prev) => prev + 1);

    try {
      const result = await createUser(data);

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === tempId ? { ...tempUser, user_id: result.user_id } : u,
        ),
      );

      setToast({ mode: "success", message: "Usuario creado exitosamente" });
    } catch (error) {
      setUsers((prev) => prev.filter((u) => u.user_id !== tempId));
      setTotal((prev) => prev - 1);

      const message =
        error instanceof Error ? error.message : "Error al crear usuario";
      setToast({ mode: "error", message });
    }
  };

  const handleUpdateUser = async (userId: string, data: UpdateUserRequest) => {
    try {
      const updatedUser = await updateUser(userId, data);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, ...updatedUser } : u)),
      );
      setToast({
        mode: "success",
        message: "Usuario actualizado exitosamente",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al actualizar usuario";
      setToast({ mode: "error", message });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este usuario?")) return;
    const userToDelete = users.find((u) => u.user_id === userId);
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    setTotal((prev) => prev - 1);
    try {
      await deleteUser(userId);
      setToast({ mode: "success", message: "Usuario eliminado exitosamente" });
    } catch (error) {
      if (userToDelete) {
        setUsers((prev) => [...prev, userToDelete]);
        setTotal((prev) => prev + 1);
      }
      const message =
        error instanceof Error ? error.message : "Error al eliminar usuario";
      setToast({ mode: "error", message });
    }
  };

  const handleCloseUpsertModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

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

      <PageHeaderBanner
        eyebrow="General"
        title="Gestión de Usuarios"
        description={`Usuarios de ${currentUser?.tenant.tenant_name ?? "tu tenant"}`}
      />

      {/* Search & Actions */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <Input
              label="Buscar usuario"
              placeholder="Buscar por email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:max-w-sm"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {total} usuario{total !== 1 ? "s" : ""}
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              className="w-full lg:w-auto"
            >
              <IconPlus />
              Nuevo Usuario
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          columns={[
            { key: "email", label: "Email", width: "35%" },
            {
              key: "role_id",
              label: "Rol",
              width: "20%",
              render: (roleId) => (
                <Badge variant="secondary">{getRoleName(roles, roleId)}</Badge>
              ),
            },

            {
              key: "created_at",
              label: "Creado",
              width: "15%",
              render: (date) => new Date(date).toLocaleDateString("es-CR"),
            },
            ...(canManageUsers
              ? [
                  {
                    key: "actions",
                    label: "Acciones",
                    width: "5%",
                    render: (_: unknown, row: User) => (
                      <div
                        className="flex gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          onClick={() => setSelectedUser(row)}
                          title="Ver detalles"
                          variant="ghost"
                          className="hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <IconEye />
                        </Button>
                        <Button
                          onClick={() => setEditingUser(row)}
                          title="Editar usuario"
                          variant="ghost"
                          className="hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <IconEdit />
                        </Button>
                        {row.role_id !== 1 && row.role_id !== 2 && (
                          <Button
                            onClick={() => handleDeleteUser(row.user_id)}
                            title="Eliminar usuario"
                            variant="danger"
                            className="hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <IconTrash />
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          data={users}
          emptyMessage="No hay usuarios para mostrar"
        />
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            limit={limit}
            onLimitChange={handleLimitChange}
            total={total}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          roles={roles}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <UserUpsertModal
        isOpen={isUpsertOpen}
        isEditing={isEditing}
        user={editingUser}
        onClose={handleCloseUpsertModal}
        tenantId={tenantId}
        roles={roles}
        isLoadingRoles={isLoadingRoles}
        onCreate={handleCreateUser}
        onUpdate={handleUpdateUser}
      />

      {/* Hidden form ref kept for compatibility */}
      <form ref={formRef} style={{ display: "none" }} />
    </div>
  );
}
