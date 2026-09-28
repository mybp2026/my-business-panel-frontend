import { useEffect, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { warehouseApi } from "@/api/warehouse.api";

import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { DiscrepancyReport } from "@/interfaces/entities/DiscrepancyReport.interface";
import type { ReportsPageLoaderData } from "@/router/loaders/inventoryReports.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

export function ReportsPage() {
  const { data } = useLoaderData() as { data: Promise<ReportsPageLoaderData> };

  return (
    <DeferredPage resolve={data}>
      {(resolved) => <ReportsPageContent {...resolved} />}
    </DeferredPage>
  );
}

function ReportsPageContent({ warehouses }: ReportsPageLoaderData) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    warehouses[0]?.warehouse_id ?? "",
  );
  const [reports, setReports] = useState<DiscrepancyReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedWarehouseId) {
      setReports([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    warehouseApi
      .listDiscrepancyReports(selectedWarehouseId)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Error al cargar reportes de discrepancia";
        setToast({ mode: "error", message });
        setReports([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWarehouseId]);

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
        title="Reportes de inventario"
        description="Historial de discrepancias por almacén"
      />

      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="max-w-xs">
          <Select
            label="Almacén"
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            options={warehouses.map((w) => ({
              value: w.warehouse_id,
              label: `${w.warehouse_name}${w.is_branch ? " (piso de venta)" : ""}`,
            }))}
            placeholder="Seleccionar almacén"
            required
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-300 p-6">
        <Table
          isLoading={isLoading}
          columns={[
            {
              key: "created_at",
              label: "Fecha",
              width: "14%",
              render: (value: unknown) =>
                new Date(value as string).toLocaleString("es-CR"),
            },
            {
              key: "variant_name",
              label: "Producto",
              width: "20%",
              render: (value: unknown) => (value as string | null) ?? "—",
            },
            {
              key: "sku",
              label: "SKU",
              width: "12%",
              render: (value: unknown) => (value as string | null) ?? "—",
            },
            {
              key: "stored_quantity",
              label: "Stock sistema",
              width: "12%",
              render: (value: unknown) => (
                <span className="font-mono">{value as number}</span>
              ),
            },
            {
              key: "physical_quantity",
              label: "Conteo físico",
              width: "12%",
              render: (value: unknown) => (
                <span className="font-mono">{value as number}</span>
              ),
            },
            {
              key: "delta",
              label: "Delta",
              width: "10%",
              render: (_: unknown, row: DiscrepancyReport) => {
                const delta = row.physical_quantity - row.stored_quantity;
                const color =
                  delta > 0
                    ? "text-emerald-700"
                    : delta < 0
                      ? "text-red-600"
                      : "text-gray-500";
                return (
                  <span className={`font-mono font-semibold ${color}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                );
              },
            },
            {
              key: "discrepancy_reason",
              label: "Motivo",
              width: "20%",
              render: (value: unknown) =>
                (value as string | null) ?? (
                  <span className="text-gray-400">—</span>
                ),
            },
          ]}
          data={reports}
          emptyMessage={
            selectedWarehouseId
              ? "No hay reportes de discrepancia para este almacén"
              : "Selecciona un almacén para ver sus reportes"
          }
        />
      </div>
    </div>
  );
}
