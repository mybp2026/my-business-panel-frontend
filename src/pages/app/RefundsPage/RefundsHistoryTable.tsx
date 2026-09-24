import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { DualCurrencyAmount } from "@/components/ui/DualCurrencyAmount";
import { IconEye } from "@/assets/icons";

import { paymentMethods, refundStatuses } from "@/constants/payment-methods";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ReturnTransaction } from "@/interfaces/entities/ReturnTransaction.interface";

import { formatDate } from "./refunds.utils";

interface RefundsHistoryTableProps {
  returns: ReturnTransaction[];
  onViewDetail: (returnId: string) => void;
}

export function RefundsHistoryTable({
  returns,
  onViewDetail,
}: RefundsHistoryTableProps) {
  const rate = useCurrentExchangeRate();
  const columns: Column[] = [
    {
      key: "return_date",
      label: "Fecha",
      width: "14%",
      render: (v: string) => formatDate(v),
    },
    {
      key: "return_transaction_id",
      label: "ID transacción",
      width: "18%",
      render: (v: string) => (
        <span className="font-mono text-xs text-gray-600 break-all">{v}</span>
      ),
    },
    {
      key: "invoice_id",
      label: "Factura",
      width: "14%",
      render: (v: string) => (
        <span className="font-mono text-xs text-gray-600 break-all">{v}</span>
      ),
    },
    {
      key: "total_refund_amount",
      label: "Monto",
      width: "10%",
      render: (v: number) => (
        <DualCurrencyAmount amountBs={Number(v)} rate={rate} bold />
      ),
    },
    {
      key: "refund_method",
      label: "Método",
      width: "10%",
      render: (v: number, row: ReturnTransaction) =>
        paymentMethods.find((m) => m.value === v)?.label ??
        row.payment_method_name ??
        `#${v ?? "—"}`,
    },
    {
      key: "return_status_id",
      label: "Estado",
      width: "11%",
      render: (v: number, row: ReturnTransaction) => {
        const label =
          refundStatuses.find((s) => s.value === v)?.label ??
          row.status_name ??
          `#${v ?? "—"}`;
        const variant: "green" | "red" | "yellow" | "gray" =
          v === 3 ? "green" : v === 2 ? "red" : v === 1 ? "yellow" : "gray";
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: "description",
      label: "Descripción",
      width: "15%",
      render: (v: string) => (
        <span
          className="text-xs text-gray-600 line-clamp-2"
          title={v}
        >
          {v || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "8%",
      render: (_: unknown, row: ReturnTransaction) => (
        <Button
          variant="ghost"
          size="sm"
          title="Ver detalle"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(row.return_transaction_id);
          }}
        >
          <IconEye />
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-300 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Reembolsos recientes
      </h2>
      <Table
        columns={columns}
        data={returns}
        emptyMessage="No hay reembolsos registrados"
      />
    </div>
  );
}
