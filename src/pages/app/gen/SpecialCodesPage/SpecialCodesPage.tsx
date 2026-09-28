import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

import {
  specialCodeApi,
  type CreateSpecialCodePayload,
  type SpecialCodeRecord,
} from "@/api/specialCode.api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import { IconPlus, IconTrash } from "@/assets/icons";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

const SUPERUSER_ROLE_ID = 1;

interface FormState {
  code: string;
  description: string;
  expires_at: string;
}

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  expires_at: "",
};

const formatDateTime = (raw: string | null | undefined) =>
  raw ? new Date(raw).toLocaleString("es-CR") : "—";

export function SpecialCodesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Defensa adicional en cliente (la guard del backend ya lo bloquea, pero
  // si un admin escribe la URL a mano lo sacamos del paso).
  useEffect(() => {
    if (user && user.role.role_id !== SUPERUSER_ROLE_ID) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [codes, setCodes] = useState<SpecialCodeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const list = await specialCodeApi.listAll();
      setCodes(list);
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar códigos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        (c.used_by_tenant_name ?? "").toLowerCase().includes(q),
    );
  }, [codes, searchQuery]);

  const stats = useMemo(() => {
    const total = codes.length;
    const used = codes.filter((c) => c.is_used).length;
    return { total, used, available: total - used };
  }, [codes]);

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code || code.length < 4) {
      setFormError("El código debe tener al menos 4 caracteres");
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setFormError(
        "Solo se admiten letras mayúsculas, dígitos, guion y guion bajo",
      );
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload: CreateSpecialCodePayload = {
        code,
        description: form.description.trim() || undefined,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : undefined,
      };
      const created = await specialCodeApi.create(payload);
      setCodes((prev) => [
        {
          ...created,
          used_by_tenant_name: null,
          created_by_email: user?.email ?? null,
        },
        ...prev,
      ]);
      setToast({ mode: "success", message: `Código "${created.code}" creado` });
      closeModal();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Error al crear el código",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (record: SpecialCodeRecord) => {
    if (record.is_used) {
      setToast({
        mode: "error",
        message: "No se puede eliminar un código ya canjeado",
      });
      return;
    }
    if (!confirm(`¿Eliminar el código "${record.code}"? Esta acción es irreversible.`))
      return;

    const snapshot = codes;
    setCodes((prev) =>
      prev.filter((c) => c.special_code_id !== record.special_code_id),
    );
    try {
      await specialCodeApi.remove(record.special_code_id);
      setToast({ mode: "success", message: "Código eliminado" });
    } catch (err) {
      setCodes(snapshot);
      setToast({
        mode: "error",
        message: err instanceof Error ? err.message : "Error al eliminar",
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
        eyebrow="General"
        title="Códigos especiales"
        description="Códigos de un solo uso que permiten registrar un tenant en el onboarding sin pasar por Stripe. Cada código se canjea una sola vez y queda asociado al tenant que lo usó."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Total emitidos" value={stats.total} />
        <StatTile label="Disponibles" value={stats.available} accent="green" />
        <StatTile label="Canjeados" value={stats.used} accent="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <Input
              label="Buscar"
              placeholder="Buscar por código, descripción o tenant"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:max-w-sm"
            />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
          >
            <IconPlus />
            Nuevo código
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          columns={[
            {
              key: "code",
              label: "Código",
              width: "18%",
              render: (value: unknown) => (
                <span className="font-mono text-sm font-semibold text-gray-900">
                  {String(value)}
                </span>
              ),
            },
            {
              key: "description",
              label: "Descripción",
              width: "22%",
              render: (value: unknown) =>
                value ? (
                  String(value)
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                ),
            },
            {
              key: "is_used",
              label: "Estado",
              width: "12%",
              render: (_: unknown, row: SpecialCodeRecord) => {
                if (row.is_used) {
                  return <Badge variant="secondary">Canjeado</Badge>;
                }
                if (
                  row.expires_at &&
                  new Date(row.expires_at) <= new Date()
                ) {
                  return <Badge variant="red">Expirado</Badge>;
                }
                return <Badge variant="green">Disponible</Badge>;
              },
            },
            {
              key: "used_by_tenant_name",
              label: "Tenant",
              width: "16%",
              render: (value: unknown) =>
                value ? (
                  String(value)
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                ),
            },
            {
              key: "used_at",
              label: "Canjeado",
              width: "12%",
              render: (value: unknown) =>
                value ? (
                  <span className="text-xs text-gray-600">
                    {formatDateTime(value as string)}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                ),
            },
            {
              key: "expires_at",
              label: "Expira",
              width: "12%",
              render: (value: unknown) =>
                value ? (
                  <span className="text-xs text-gray-600">
                    {formatDateTime(value as string)}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Sin vencimiento</span>
                ),
            },
            {
              key: "actions",
              label: "Acciones",
              width: "8%",
              render: (_: unknown, row: SpecialCodeRecord) => (
                <Button
                  variant="danger"
                  onClick={() => handleDelete(row)}
                  disabled={row.is_used}
                  title={
                    row.is_used
                      ? "No se puede eliminar un código canjeado"
                      : "Eliminar código"
                  }
                >
                  <IconTrash />
                </Button>
              ),
            },
          ]}
          data={filtered}
          emptyMessage={
            isLoading ? "Cargando..." : "Aún no hay códigos especiales"
          }
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Emitir código especial"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Emite un código que el cliente podrá canjear una sola vez en el
            paso de pago del onboarding para crear su cuenta sin cargo.
          </p>

          <Input
            label="Código"
            placeholder="VIP-2026-001"
            value={form.code}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                code: e.target.value.toUpperCase().replace(/\s/g, ""),
              }))
            }
            maxLength={64}
            hint="Mayúsculas, números, guion y guion bajo. Mínimo 4 caracteres."
            required
          />

          <Input
            label="Descripción"
            placeholder="Para qué cliente / propósito (opcional)"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            maxLength={500}
          />

          <Input
            label="Vence el"
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) =>
              setForm((p) => ({ ...p, expires_at: e.target.value }))
            }
            hint="Opcional. Si lo dejas vacío, el código no caduca."
          />

          {formError && (
            <p className="text-sm font-medium text-red-600">{formError}</p>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleCreate}
              loading={isSubmitting}
            >
              Crear código
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "green" | "amber";
}) {
  const tone =
    accent === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-white text-gray-700";

  return (
    <div className={`rounded-2xl border ${tone} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
