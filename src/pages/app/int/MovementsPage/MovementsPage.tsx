import { useCallback, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { warehouseApi } from "@/api/warehouse.api";
import { createInventoryTransfer } from "@/router/actions/inventoryTransfer.actions";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { IconCheckCircle, IconEye, IconPlus, IconX } from "@/assets/icons";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { InventoryTransfer } from "@/interfaces/entities/InventoryTransfer.interface";
import type { InventoryTransferDetail } from "@/interfaces/entities/InventoryTransferDetail.interface";
import type { InventoryTransferProductInput } from "@/interfaces/api/requests/CreateInventoryTransferRequest.interface";
import type { MovementsPageLoaderData } from "@/router/loaders/inventoryTransfer.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { TransferModal } from "./TransferModal";
import { TransferDetailModal } from "./TransferDetailModal";

interface TransferRequestProduct {
  product_variant_id: string;
  variant_name: string;
  sku: string;
  amount: number;
}

interface TransferRequest {
  inventory_transfer_request_id: string;
  from_warehouse_name: string;
  to_warehouse_name: string;
  status_name: string;
  requested_by_user_id: string;
  created_at: string;
  rejection_reason?: string;
  requested_by_user_name?: string;
  products?: TransferRequestProduct[];
}

export function MovementsPage() {
  const { data } = useLoaderData() as {
    data: Promise<MovementsPageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {(resolved) => <MovementsPageContent {...resolved} />}
    </DeferredPage>
  );
}

function MovementsPageContent({
  transfers: initialTransfers,
  warehouses,
  requests: initialRequests,
  tenantId,
}: MovementsPageLoaderData) {
  const { user } = useAuth();

  const [transfers, setTransfers] =
    useState<InventoryTransfer[]>(initialTransfers);
  const [requests, setRequests] = useState<TransferRequest[]>(initialRequests);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTransferDetailOpen, setIsTransferDetailOpen] = useState(false);
  const [selectedTransferDetail, setSelectedTransferDetail] =
    useState<InventoryTransferDetail | null>(null);
  const [isLoadingTransferDetail, setIsLoadingTransferDetail] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [selectedRequest, setSelectedRequest] =
    useState<TransferRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const isAdmin = user?.role?.role_id === 1 || user?.role?.role_id === 2;
  const filteredRequests = useMemo(() => {
    if (isAdmin) return requests;
    return requests.filter((req) => req.requested_by_user_id === user?.user_id);
  }, [requests, isAdmin, user?.user_id]);

  const handleCreateTransfer = async (payload: {
    origin_warehouse_id: string;
    destination_warehouse_id: string;
    departure_date: string | null;
    arrival_date: string | null;
    products: InventoryTransferProductInput[];
  }) => {
    if (!tenantId) {
      setToast({ mode: "error", message: "Tenant no disponible" });
      return;
    }
    setIsSubmitting(true);
    try {
      await createInventoryTransfer({
        ...payload,
        tenant_id: tenantId,
      });
      const refreshed = await warehouseApi.listTransfers();
      setTransfers(refreshed);
      setToast({ mode: "success", message: "Transferencia creada" });
      setIsModalOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al crear transferencia";
      setToast({ mode: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRequest = useCallback(
    async (requestId: string) => {
      setIsSubmitting(true);
      try {
        await warehouseApi.updateTransferRequestStatus(requestId, "approved");
        setRequests(
          requests.filter((r) => r.inventory_transfer_request_id !== requestId),
        );
        setToast({ mode: "success", message: "Solicitud aprobada" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al aprobar solicitud";
        setToast({ mode: "error", message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [requests],
  );

  const handleRejectRequest = useCallback(async () => {
    if (!selectedRequestId) return;
    setIsSubmitting(true);
    try {
      await warehouseApi.updateTransferRequestStatus(
        selectedRequestId,
        "rejected",
        rejectionReason || undefined,
      );
      setRequests(
        requests.filter(
          (r) => r.inventory_transfer_request_id !== selectedRequestId,
        ),
      );
      setToast({ mode: "success", message: "Solicitud rechazada" });
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setSelectedRequestId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al rechazar solicitud";
      setToast({ mode: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRequestId, rejectionReason, requests]);

  const handleViewTransfer = useCallback(async (transferId: string) => {
    setIsLoadingTransferDetail(true);
    try {
      const detail = await warehouseApi.getTransferDetail(transferId);
      setSelectedTransferDetail(detail);
      setIsTransferDetailOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al cargar detalle de transferencia";
      setToast({ mode: "error", message });
    } finally {
      setIsLoadingTransferDetail(false);
    }
  }, []);

  const handleCancelRequest = useCallback(
    async (requestId: string) => {
      setIsSubmitting(true);
      try {
        await warehouseApi.updateTransferRequestStatus(
          requestId,
          "rejected",
          "Cancelada por el usuario",
        );
        setRequests(
          requests.filter((r) => r.inventory_transfer_request_id !== requestId),
        );
        setToast({ mode: "success", message: "Solicitud cancelada" });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al cancelar solicitud";
        setToast({ mode: "error", message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [requests],
  );

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
        eyebrow="INT"
        title="Movimientos de inventario"
        description="Transferencias entre almacenes y pisos de venta"
      />

      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <div className="flex items-center justify-end my-0 mb-6">
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            disabled={warehouses.length < 2}
          >
            <IconPlus />
            Nueva transferencia
          </Button>
        </div>

        <Table
          columns={[
            {
              key: "inventory_transfer_id",
              label: "ID",
              width: "10%",
              render: (value: unknown) => (
                <span className="font-mono text-[11px]">
                  {String(value).slice(0, 5)}
                </span>
              ),
            },
            { key: "from_warehouse_name", label: "Origen", width: "22%" },
            { key: "to_warehouse_name", label: "Destino", width: "22%" },
            {
              key: "total_lines",
              label: "Líneas",
              width: "12%",
              render: (value: unknown) => (
                <span className="font-mono">{value as number}</span>
              ),
            },
            {
              key: "total_units",
              label: "Unidades",
              width: "12%",
              render: (value: unknown) => (
                <span className="font-mono">{value as number}</span>
              ),
            },
            {
              key: "transfer_date",
              label: "Fecha",
              width: "18%",
              render: (value: unknown) =>
                new Date(value as string).toLocaleString("es-CR"),
            },
          ]}
          data={transfers}
          emptyMessage="No hay transferencias registradas"
          isLoading={isLoadingTransferDetail}
          onRowClick={(row) =>
            handleViewTransfer(row.inventory_transfer_id as string)
          }
        />
      </div>

      {filteredRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-300 p-6 mt-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Solicitudes de movimiento
            </h2>
            <p className="text-sm text-gray-600">
              {isAdmin
                ? "Gestionar todas las solicitudes de movimiento del tenant"
                : "Ver y cancelar tus solicitudes de movimiento"}
            </p>
          </div>
          <Table
            columns={[
              { key: "from_warehouse_name", label: "Origen", width: "22%" },
              { key: "to_warehouse_name", label: "Destino", width: "22%" },
              {
                key: "status_name",
                label: "Estado",
                width: "16%",
                render: (value: unknown) => (
                  <Badge
                    variant={
                      value === "pending"
                        ? "yellow"
                        : value === "approved"
                          ? "success"
                          : "red"
                    }
                  >
                    {value as string}
                  </Badge>
                ),
              },
              {
                key: "created_at",
                label: "Solicitada",
                width: "12%",
                render: (value: unknown) =>
                  new Date(value as string).toLocaleDateString("es-CR"),
              },
              {
                key: "inventory_transfer_request_id",
                label: "Acciones",
                width: "28%",
                render: (value: unknown) => {
                  const requestId = value as string;
                  const request = filteredRequests.find(
                    (r) => r.inventory_transfer_request_id === requestId,
                  );
                  if (!request) return null;

                  const isPending = request.status_name === "pending";
                  return (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsDetailModalOpen(true);
                        }}
                        disabled={isSubmitting}
                        aria-label="Ver detalle"
                      >
                        <IconEye />
                      </Button>
                      {isAdmin ? (
                        <>
                          {isPending && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleApproveRequest(requestId)}
                                disabled={isSubmitting}
                              >
                                <IconCheckCircle />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequestId(requestId);
                                  setIsRejectModalOpen(true);
                                }}
                                disabled={isSubmitting}
                              >
                                <IconX />
                              </Button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {isPending && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancelRequest(requestId)}
                              disabled={isSubmitting}
                            >
                              Cancelar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={filteredRequests}
            emptyMessage="No hay solicitudes de movimiento"
          />
        </div>
      )}

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Rechazar solicitud"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Proporciona un motivo opcional para el rechazo:
          </p>
          <Input
            type="text"
            placeholder="Motivo de rechazo (opcional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectionReason("");
                setSelectedRequestId(null);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleRejectRequest}
              disabled={isSubmitting}
            >
              Rechazar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        title="Detalle de solicitud"
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">
                  Almacén origen
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedRequest.from_warehouse_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">
                  Almacén destino
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedRequest.to_warehouse_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Estado</p>
                <Badge
                  variant={
                    selectedRequest.status_name === "pending"
                      ? "yellow"
                      : selectedRequest.status_name === "approved"
                        ? "success"
                        : "red"
                  }
                >
                  {selectedRequest.status_name}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Solicitada</p>
                <p className="text-sm text-gray-900">
                  {new Date(selectedRequest.created_at).toLocaleDateString(
                    "es-CR",
                  )}
                </p>
              </div>
            </div>

            {selectedRequest.requested_by_user_name && (
              <div>
                <p className="text-xs text-gray-500 uppercase">
                  Solicitado por
                </p>
                <p className="text-sm text-gray-900">
                  {selectedRequest.requested_by_user_name}
                </p>
              </div>
            )}

            {selectedRequest.products &&
              selectedRequest.products.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">
                    Productos solicitados
                  </p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">
                            Producto
                          </th>
                          <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">
                            SKU
                          </th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">
                            Cantidad
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRequest.products.map((p) => (
                          <tr key={p.product_variant_id}>
                            <td className="px-3 py-2 text-gray-900">
                              {p.variant_name}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-500 text-xs">
                              {p.sku}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-900 text-right">
                              {p.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {selectedRequest.rejection_reason && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-xs text-red-700 uppercase font-semibold">
                  Motivo de rechazo
                </p>
                <p className="text-sm text-red-900 mt-1">
                  {selectedRequest.rejection_reason}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedRequest(null);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <TransferDetailModal
        isOpen={isTransferDetailOpen}
        transfer={selectedTransferDetail}
        onClose={() => {
          setIsTransferDetailOpen(false);
          setSelectedTransferDetail(null);
        }}
      />

      <TransferModal
        isOpen={isModalOpen}
        warehouses={warehouses}
        tenantId={tenantId}
        isSubmitting={isSubmitting}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTransfer}
      />
    </div>
  );
}
