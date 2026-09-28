import { Modal } from "@/components/ui/Modal";
import type { InventoryTransferDetail } from "@/interfaces/entities/InventoryTransferDetail.interface";

interface TransferDetailModalProps {
  transfer: InventoryTransferDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransferDetailModal({
  transfer,
  isOpen,
  onClose,
}: TransferDetailModalProps) {
  if (!transfer) return null;

  const field = (label: string, value: string) => (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-0.5">
        {label}
      </p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de transferencia"
      size="md"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {field("Almacen origen", transfer.from_warehouse_name)}
          {field("Almacen destino", transfer.to_warehouse_name)}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field(
            "Fecha de transferencia",
            new Date(transfer.transfer_date).toLocaleString("es-CR"),
          )}
          {field(
            "Fecha de partida",
            new Date(transfer.inventory_transfer_departure_date).toLocaleString(
              "es-CR",
            ),
          )}
        </div>

        {transfer.inventory_transfer_arrival_date &&
          field(
            "Fecha de llegada",
            new Date(transfer.inventory_transfer_arrival_date).toLocaleString(
              "es-CR",
            ),
          )}

        <div className="grid grid-cols-2 gap-4">
          {field(
            "Tipo de movimiento en origen",
            transfer.log_type_out_name ?? "OUT",
          )}
          {field(
            "Tipo de movimiento en destino",
            transfer.log_type_in_name ?? "IN",
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
            Productos transferidos
          </p>
          {transfer.products.length === 0 ? (
            <p className="text-sm text-gray-500">Sin productos registrados</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                      Producto
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                      Cantidad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfer.products.map((p) => (
                    <tr key={p.product_variant_id}>
                      <td className="px-3 py-2 text-gray-900">
                        {p.variant_name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {p.sku ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-900">
                        {p.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3">
          {field("ID de transferencia", transfer.inventory_transfer_id)}
        </div>
      </div>
    </Modal>
  );
}
