import type { SaleRefundContext } from "@/interfaces/entities/SaleRefundContext.interface";

import type { ItemSelection } from "@/hooks/useRefundFlow";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";

interface SelectableProps {
  mode: "partial";
  items: SaleRefundContext["items"];
  selections: Record<string, ItemSelection>;
  onToggle: (id: string) => void;
  onQtyChange: (id: string, qty: number, available: number) => void;
  currencySymbol: string;
}

interface ReadOnlyProps {
  mode: "full";
  items: SaleRefundContext["items"];
  currencySymbol: string;
}

type RefundItemsTableProps = SelectableProps | ReadOnlyProps;

export function RefundItemsTable(props: RefundItemsTableProps) {
  const { mode, items } = props;
  const selectable = mode === "partial";
  const rate = useCurrentExchangeRate();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
            {selectable && <th className="py-2 w-12"></th>}
            <th className="py-2">Producto</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">
              {selectable ? "Disp." : "Cant."}
            </th>
            {selectable && <th className="py-2 text-right">A devolver</th>}
            <th className="py-2 text-right">Precio</th>
            <th className="py-2 text-right">
              {selectable ? "Subtotal" : "Total"}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            if (props.mode === "partial") {
              const sel = props.selections[it.sale_item_id];
              const qty = sel?.quantity ?? it.available_quantity;
              const lineTotal = sel?.selected
                ? Number((qty * it.unit_price).toFixed(2))
                : 0;
              return (
                <tr
                  key={it.sale_item_id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={sel?.selected ?? false}
                      onChange={() => props.onToggle(it.sale_item_id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="py-2">{it.variant_name ?? "—"}</td>
                  <td className="py-2 font-mono text-xs text-gray-600">
                    {it.sku ?? "—"}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {it.available_quantity}
                  </td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={1}
                      max={it.available_quantity}
                      value={qty}
                      disabled={!sel?.selected}
                      onChange={(e) =>
                        props.onQtyChange(
                          it.sale_item_id,
                          Number(e.target.value),
                          it.available_quantity,
                        )
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-right disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <DualCurrencyAmount amountBs={it.unit_price} rate={rate} align="right" />
                  </td>
                  <td className="py-2 text-right font-semibold">
                    <DualCurrencyAmount amountBs={lineTotal} rate={rate} bold align="right" />
                  </td>
                </tr>
              );
            }

            return (
              <tr key={it.sale_item_id} className="border-b border-gray-100">
                <td className="py-2">{it.variant_name ?? "—"}</td>
                <td className="py-2 font-mono text-xs text-gray-600">
                  {it.sku ?? "—"}
                </td>
                <td className="py-2 text-right font-mono">
                  {it.available_quantity}
                </td>
                <td className="py-2 text-right">
                  <DualCurrencyAmount amountBs={it.unit_price} rate={rate} align="right" />
                </td>
                <td className="py-2 text-right font-semibold">
                  <DualCurrencyAmount amountBs={it.total_price} rate={rate} bold align="right" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
