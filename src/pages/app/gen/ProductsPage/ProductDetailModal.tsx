import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Product } from "@/interfaces/entities/Product.interface";

export function ProductDetailModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const field = (label: string, value?: string | number | boolean | null) => {
    const display =
      typeof value === "boolean"
        ? value
          ? "Activo"
          : "Inactivo"
        : value != null
          ? String(value)
          : "—";
    return (
      <div key={label}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-sm text-gray-900">{display}</p>
      </div>
    );
  };

  const pv = product as Product & {
    variant_name?: string;
    unit_price?: number;
    cost_price?: number;
    product_variant_id?: string;
    is_active?: boolean;
    is_composite?: boolean;
    tenant_name?: string;
    supplier_name?: string;
    giftable?: boolean;
    giftable_from?: number;
    includes_iva?: boolean;
  };

  return (
    <Modal isOpen onClose={onClose} title="Detalle de Producto" size="md">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Variante de Producto
          </p>
          <div className="grid grid-cols-2 gap-4">
            {field("SKU", pv.sku)}
            {field("Nombre", pv.variant_name || pv.product_name)}
            {field(
              "Tipo",
              pv.is_composite ? "Lote / Compuesto" : "Producto simple",
            )}
            {field("Proveedor", pv.supplier_name)}
            {field(
              "Costo unitario",
              pv.cost_price != null
                ? `Bs. ${Number(pv.cost_price).toLocaleString("es-VE")}`
                : null,
            )}
            {field(
              "Precio de venta",
              pv.unit_price != null
                ? `Bs. ${Number(pv.unit_price).toLocaleString("es-VE")}`
                : pv.price != null
                  ? `Bs. ${Number(pv.price).toLocaleString("es-VE")}`
                  : null,
            )}
            {field(
              "IVA en precio",
              pv.includes_iva === true
                ? "Incluido"
                : "No incluido (se aplica al vender)",
            )}

            {field("Estado", pv.is_active)}
            {field("ID", pv.product_variant_id || pv.product_id)}
          </div>
        </div>

        {pv.description && (
          <div className="border-t border-gray-100 pt-4">
            {field("Descripción", pv.description)}
          </div>
        )}

        {pv.tenant_name && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Empresa
            </p>
            {field("Tenant", pv.tenant_name)}
          </div>
        )}

        {pv.giftable != null && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Regalabilidad
            </p>
            <div className="grid grid-cols-2 gap-4">
              {field("Aplica como regalo", pv.giftable ? "Sí" : "No")}
              {pv.giftable &&
                field(
                  "Monto mínimo para regalo",
                  pv.giftable_from != null
                    ? `Bs. ${Number(pv.giftable_from).toLocaleString("es-VE")}`
                    : "Sin mínimo",
                )}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {field(
              "Creado",
              pv.created_at
                ? new Date(pv.created_at).toLocaleString("es-CR")
                : "—",
            )}
            {field(
              "Actualizado",
              pv.updated_at
                ? new Date(pv.updated_at).toLocaleString("es-CR")
                : "—",
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
