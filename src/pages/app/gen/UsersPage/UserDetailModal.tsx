import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

import type { Role } from "@/interfaces/entities/Role.interface";
import type { User } from "@/interfaces/entities/User.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { getUserById } from "@/router/loaders/user.loaders";

import { capitalize } from "@/utils/capitalize";

export function UserDetailModal({
  user,
  roles,
  onClose,
}: {
  user: User;
  roles: Role[];
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  useEffect(() => {
    setIsLoading(true);

    getUserById(user.user_id, true)
      .then((fetchedUser) => {
        setDetailUser(fetchedUser);
      })
      .catch(() => {
        setDetailUser(user);
        setToast({
          mode: "error",
          message: "Error al obtener detalles del usuario",
        });
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const currentUser = detailUser ?? user;
  const roleFromList = roles.find((r) => r.role_id === currentUser.role_id);
  const roleName =
    currentUser.role?.role_name ||
    roleFromList?.role_name ||
    `Role ${currentUser.role_id}`;
  const roleHierarchy =
    currentUser.role?.role_hierarchy ?? roleFromList?.role_hierarchy ?? null;

  const field = (label: string, value?: string | number | null) => (
    <div key={label}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-gray-900">{value ?? "—"}</p>
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title="Detalle de Usuario" size="md">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* User section */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Usuario
              </p>
              <div className="grid grid-cols-2 gap-4">
                {field("ID", currentUser.user_id)}
                {field("Tenant ID", currentUser.tenant_id)}
                {field("Email", currentUser.email)}
                {field("Rol", capitalize(roleName))}
                {field("Role ID", currentUser.role_id)}
                {field("Jerarquía de rol", roleHierarchy)}
                {field(
                  "Creado",
                  new Date(currentUser.created_at).toLocaleString("es-CR"),
                )}
                {field(
                  "Actualizado",
                  new Date(currentUser.updated_at).toLocaleString("es-CR"),
                )}
              </div>
            </div>

            {/* Tenant section */}
            {currentUser.tenant && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Empresa (Tenant)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {field("Tenant ID", currentUser.tenant.tenant_id)}
                  {field("Nombre", currentUser.tenant.tenant_name)}
                  {field("Email", currentUser.tenant.contact_email)}
                  {field(
                    "Suscripción",
                    currentUser.tenant.is_subscribed ? "Activa" : "Inactiva",
                  )}
                  {field(
                    "Creado",
                    new Date(currentUser.tenant.created_at).toLocaleString(
                      "es-CR",
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Employee section (if available) */}
            {currentUser.employee && (
              <>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Empleado
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {field(
                      "Nombre completo",
                      `${currentUser.employee.first_name} ${currentUser.employee.last_name}`.trim(),
                    )}
                    {field("Documento", currentUser.employee.document_number)}
                    {field("Teléfono", currentUser.employee.phone)}
                    {field("Email", currentUser.employee.employee_email)}
                    {field(
                      "Estado",
                      currentUser.employee.is_active ? "Activo" : "Inactivo",
                    )}
                    {field("Sucursal ID", currentUser.employee.branch_id)}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Contrato
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {field(
                      "Salario base",
                      currentUser.employee.base_salary != null
                        ? `Bs. ${Number(currentUser.employee.base_salary).toLocaleString("es-VE")}`
                        : null,
                    )}
                    {field("Horas", currentUser.employee.hours)}
                    {field("Inicio", currentUser.employee.start_date)}
                    {field(
                      "Fin",
                      currentUser.employee.end_date ?? "Indefinido",
                    )}
                    {field("Funciones", currentUser.employee.duties)}
                    {field("Tipo de turno", currentUser.employee.turn_type)}
                  </div>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-gray-100">
              <Button type="button" variant="ghost" fullWidth onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
