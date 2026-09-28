import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import { IconEdit, IconPlus, IconTrash } from "@/assets/icons";

import { useAuth } from "@/context/AuthContext";

import {
  createPromotion,
  deletePromotion,
  updatePromotion,
} from "@/router/actions/promotion.actions";
import { getPromotionsByTenant } from "@/router/loaders/promotion.loaders";
import { promotionApi } from "@/api/promotion.api";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { CreatePromotionRequest } from "@/interfaces/api/requests/CreatePromotionRequest.interface";
import type { Promotion } from "@/interfaces/entities/Promotion.interface";
import type { PromotionsPageLoaderData } from "@/router/loaders/promotion.loaders";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { promotionTypeLabel } from "@/utils/promotion";
import { PromotionUpsertModal } from "./PromotionUpsertModal";
import { capitalize } from "@/utils/capitalize";

const formatDate = (raw?: string) =>
  raw ? new Date(raw).toLocaleDateString("es-CR") : "—";

export function PromotionsPage() {
  const { data } = useLoaderData() as {
    data: Promise<PromotionsPageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {({ promotions, promotionTypes, segments, tenantId }) => (
        <PromotionsPageContent
          promotions={promotions}
          promotionTypes={promotionTypes}
          segments={segments}
          tenantId={tenantId}
        />
      )}
    </DeferredPage>
  );
}

function PromotionsPageContent({
  promotions,
  promotionTypes,
  segments,
  tenantId,
}: PromotionsPageLoaderData) {
  const { user } = useAuth();

  const canManage =
    user?.role.role_id === 1 ||
    user?.role.role_id === 2 ||
    user?.role.role_id === 3;

  const [items, setItems] = useState<Promotion[]>(promotions ?? []);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (p) =>
        p.promotion_name?.toLowerCase().includes(q) ||
        p.promotion_code?.toLowerCase().includes(q) ||
        promotionTypeLabel(p.type_name).toLowerCase().includes(q) ||
        (p.segment_names ?? []).some((s) => s.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const refreshList = async () => {
    if (!tenantId) return;
    try {
      const fresh = await getPromotionsByTenant(tenantId);
      setItems(fresh);
    } catch {
      // ignore — local state already updated optimistically
    }
  };

  const handleCreate = async (data: CreatePromotionRequest) => {
    try {
      await createPromotion(data);
      setToast({ mode: "success", message: "Promoción creada exitosamente" });
      await refreshList();
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error al crear promoción",
      });
      throw error;
    }
  };

  const handleUpdate = async (
    promotionId: string,
    data: CreatePromotionRequest,
  ) => {
    try {
      await updatePromotion(promotionId, data);
      setToast({
        mode: "success",
        message: "Promoción actualizada exitosamente",
      });
      await refreshList();
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al actualizar promoción",
      });
      throw error;
    }
  };

  const handleDelete = async (promotion: Promotion) => {
    if (!promotion.promotion_id) {
      setToast({
        mode: "error",
        message:
          "No se puede eliminar: la promoción no tiene identificador disponible",
      });
      return;
    }
    if (!confirm("¿Eliminar esta promoción? Esta acción no se puede deshacer."))
      return;

    const previous = items;
    setItems((prev) =>
      prev.filter((p) => p.promotion_id !== promotion.promotion_id),
    );

    try {
      await deletePromotion(promotion.promotion_id);
      setToast({
        mode: "success",
        message: "Promoción eliminada exitosamente",
      });
    } catch (error) {
      setItems(previous);
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al eliminar promoción",
      });
    }
  };

  const handleToggleActive = async (promotion: Promotion) => {
    const promotionId = promotion.promotion_id;
    if (!promotionId) return;

    const previous = items;
    const nextActive = !promotion.is_active;

    setItems((prev) =>
      prev.map((item) =>
        item.promotion_id === promotionId
          ? { ...item, is_active: nextActive }
          : item,
      ),
    );

    try {
      await updatePromotion(promotionId, { is_active: nextActive });
      setToast({
        mode: "success",
        message: nextActive ? "Promoción activada" : "Promoción desactivada",
      });
    } catch (error) {
      setItems(previous);
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al cambiar el estado de la promoción",
      });
    }
  };

  const isUpsertOpen = isCreateOpen || !!editingPromotion;
  const isEditing = !!editingPromotion;

  const columns: Column[] = [
    { key: "promotion_name", label: "Nombre", width: "22%" },
    {
      key: "promotion_code",
      label: "Código",
      width: "13%",
      render: (v) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      key: "type_name",
      label: "Tipo",
      width: "18%",
      render: (v) => (
        <Badge variant="blue">{promotionTypeLabel(v as string)}</Badge>
      ),
    },
    {
      key: "segment_names",
      label: "Segmentos",
      width: "12%",
      render: (_: unknown, row: Promotion) => {
        if (row.is_universal !== false)
          return <Badge variant="secondary">Todos</Badge>;
        const names = row.segment_names ?? [];
        if (names.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((n) => (
              <Badge key={n} variant="secondary">
                {capitalize(n)}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: "is_active",
      label: "Estado",
      width: "10%",
      render: (v) =>
        v ? (
          <Badge variant="green">Activa</Badge>
        ) : (
          <Badge variant="red">Inactiva</Badge>
        ),
    },
    {
      key: "promotion_start_date",
      label: "Fecha de inicio",
      width: "12%",
      render: (v) => formatDate(v as string),
    },
    {
      key: "promotion_end_date",
      label: "Fecha de expiración",
      width: "12%",
      render: (v) => formatDate(v as string),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            label: "Acciones",
            width: "7%",
            render: (_: unknown, row: Promotion) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  onClick={() => handleToggleActive(row)}
                  title={
                    row.is_active ? "Desactivar promoción" : "Activar promoción"
                  }
                  variant="secondary"
                  className="hover:bg-gray-50 rounded-lg transition-colors"
                  disabled={!row.promotion_id}
                >
                  {row.is_active ? "Off" : "On"}
                </Button>
                <Button
                  onClick={async () => {
                    if (!row.promotion_id) return;
                    // Fetch full info so the modal can pre-fill rules and
                    // group targets that the list endpoint doesn't include.
                    try {
                      const full = await promotionApi.getInfo(row.promotion_id);
                      setEditingPromotion(full ?? row);
                    } catch {
                      setEditingPromotion(row);
                    }
                  }}
                  title="Editar promoción"
                  variant="ghost"
                  className="hover:bg-gray-50 rounded-lg transition-colors"
                  disabled={!row.promotion_id}
                >
                  <IconEdit />
                </Button>
                <Button
                  onClick={() => handleDelete(row)}
                  title="Eliminar promoción"
                  variant="danger"
                  className="hover:bg-red-50 rounded-lg transition-colors"
                  disabled={!row.promotion_id}
                >
                  <IconTrash />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

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
        eyebrow="POS"
        title="Gestión de Promociones"
        description="Cree y administre las promociones aplicables en sus ventas."
      />

      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <Input
              label="Buscar promoción"
              placeholder="Buscar por nombre, código, tipo o segmento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full lg:max-w-sm"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {items.length} promoci{items.length !== 1 ? "ones" : "ón"}
            </span>
            {canManage && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateOpen(true)}
                className="w-full lg:w-auto"
              >
                <IconPlus />
                Nueva promoción
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          columns={columns}
          data={filtered}
          emptyMessage="No hay promociones para mostrar"
        />
      </div>

      <PromotionUpsertModal
        isOpen={isUpsertOpen}
        isEditing={isEditing}
        promotion={editingPromotion}
        tenantId={tenantId}
        promotionTypes={promotionTypes}
        segments={segments}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingPromotion(null);
        }}
        onSubmit={async (data) => {
          if (isEditing && editingPromotion?.promotion_id) {
            await handleUpdate(editingPromotion.promotion_id, data);
          } else {
            await handleCreate(data);
          }
        }}
      />
    </div>
  );
}
