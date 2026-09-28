import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cashRegisterApi } from "@/api/cashRegister.api";
import type {
  CashRegisterSession,
  SessionGroupSale,
  SessionPaymentMethodSale,
} from "@/interfaces/entities/CashRegister.interface";

interface Props {
  session: CashRegisterSession | null;
  onClose: () => void;
}

const fmt = (value?: number | string | null) => {
  const num = Number(value);
  return value === undefined || value === null || isNaN(num)
    ? "—"
    : `Bs. ${num.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
};

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("es-VE") : "—";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
      {children}
    </p>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-0 ${highlight ? "font-semibold" : ""}`}
    >
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  valueNode,
  mono,
}: {
  label: string;
  value?: string | number;
  valueNode?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <div className={`mt-1 text-sm text-gray-900 ${mono ? "font-mono break-all" : ""}`}>
        {valueNode ?? value ?? "—"}
      </div>
    </div>
  );
}

const RowWithComparison = ({
  label,
  system,
  user,
  userOptional,
}: {
  label: string;
  system: number | string | null | undefined;
  user?: number | string | null;
  userOptional?: boolean;
}) => {
  const fmtAmt = (val: number | string | null | undefined) => {
    if (val === undefined || val === null) return userOptional ? "—" : "Bs. 0,00";
    const num = Number(val);
    if (isNaN(num)) return "—";
    return `Bs. ${num.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
  };

  const fmtSys = (val: number | string | null | undefined) => {
    if (val === undefined || val === null) return "Bs. 0,00";
    const num = Number(val);
    if (isNaN(num)) return "Bs. 0,00";
    return `Bs. ${num.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-3 items-center py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-right font-mono text-xs text-gray-800">
        {fmtSys(system)}
      </span>
      <span className="text-right font-mono text-xs text-indigo-600 font-semibold">
        {fmtAmt(user)}
      </span>
    </div>
  );
};

export function CashSessionModal({ session, onClose }: Props) {
  const [groupSales, setGroupSales] = useState<SessionGroupSale[]>([]);
  const [, setPaymentSales] = useState<SessionPaymentMethodSale[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session || session.is_active) {
      setGroupSales([]);
      setPaymentSales([]);
      return;
    }
    setIsLoading(true);
    Promise.all([
      cashRegisterApi.getSessionReport(session.cash_register_session_id),
      cashRegisterApi.getPaymentMethods(session.cash_register_session_id),
    ])
      .then(([groups, payments]) => {
        setGroupSales(groups);
        setPaymentSales(payments);
      })
      .catch(() => {
        setGroupSales([]);
        setPaymentSales([]);
      })
      .finally(() => setIsLoading(false));
  }, [session]);

  if (!session) return null;

  const expectedCash =
    (Number(session.opening_amount) || 0) +
    (Number(session.cash_sales_amount) || 0);

  return (
    <Modal isOpen={!!session} onClose={onClose} title="Detalle de sesión" size="lg">
      <div className="flex flex-col gap-5">
        {/* Identificación */}
        <div>
          <SectionTitle>Identificación</SectionTitle>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="ID de sesión" value={session.cash_register_session_id} mono />
            <Field
              label="Estado"
              valueNode={
                <Badge variant={session.is_active ? "green" : "gray"}>
                  {session.is_active ? "Activa" : "Cerrada"}
                </Badge>
              }
            />
            <Field label="Caja" value={session.register_name ?? "—"} />
            <Field label="Sucursal" value={session.branch_name ?? "—"} />
            <Field
              label="Usuario"
              value={
                session.user_first_name
                  ? `${session.user_first_name} ${session.user_last_name}`
                  : session.user_id
              }
            />
            <Field label="Apertura" value={fmtDate(session.opened_at)} />
            <Field label="Cierre" value={fmtDate(session.closed_at)} />
            <Field label="Creada" value={fmtDate(session.created_at)} />
            <Field label="Actualizada" value={fmtDate(session.updated_at)} />
          </div>
        </div>

        {/* Fondos */}
        <div>
          <SectionTitle>Fondos</SectionTitle>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
            <Row label="Fondo de caja (apertura)" value={fmt(session.opening_amount)} />
            <Row label="Efectivo de caja (cierre)" value={fmt(session.closing_amount)} />
            <Row label="Efectivo esperado en caja" value={fmt(expectedCash)} />
          </div>
        </div>

        {/* Ventas por método */}
        <div>
          <SectionTitle>Ventas por método de pago</SectionTitle>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
            <div className="grid grid-cols-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1 mb-2 border-b border-gray-100">
              <span>Método</span>
              <span className="text-right">Sistema</span>
              <span className="text-right">Cajero</span>
            </div>

            <RowWithComparison
              label="Efectivo (cash)"
              system={session.cash_sales_amount}
              user={session.user_cash_amount}
            />
            <RowWithComparison
              label="Tarjeta de débito"
              system={session.debit_sales_amount}
              user={session.user_debit_amount}
            />
            <RowWithComparison
              label="Tarjeta de crédito"
              system={session.credit_sales_amount}
              user={session.user_credit_amount}
            />
            <RowWithComparison
              label="Transferencia"
              system={session.transfer_sales_amount}
              user={session.user_transfer_amount}
            />
            <RowWithComparison
              label="Puntos de fidelidad"
              system={session.points_sales_amount}
              user={undefined}
              userOptional
            />
            <Row
              label="Total ventas"
              value={fmt(session.total_sales_amount)}
              highlight
            />
          </div>
        </div>

        {/* Ventas por grupo */}
        {!session.is_active && (
          <div>
            <SectionTitle>Ventas por grupo de productos</SectionTitle>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              {isLoading ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : groupSales.length === 0 ? (
                <p className="text-sm text-gray-400">Sin desglose por grupo</p>
              ) : (
                <div className="space-y-1">
                  {groupSales.map((g) => (
                    <Row
                      key={g.tenant_product_group_id}
                      label={g.group_name}
                      value={fmt(g.total_amount)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mismatch */}
        {session.mismatch && (
          <div
            className={`rounded-xl border p-4 ${
              session.mismatch_type === "surplus"
                ? "bg-blue-50 border-blue-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <p
              className={`text-sm font-semibold mb-1 ${
                session.mismatch_type === "surplus" ? "text-blue-800" : "text-red-800"
              }`}
            >
              Discrepancia de caja:{" "}
              {session.mismatch_type === "surplus" ? "Excedente" : "Faltante"}
            </p>
            <p
              className={`text-2xl font-bold ${
                session.mismatch_type === "surplus" ? "text-blue-900" : "text-red-900"
              }`}
            >
              {session.mismatch_amount != null
                ? `${session.mismatch_type === "surplus" ? "+" : "-"}${fmt(session.mismatch_amount)}`
                : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cierre ingresado: {fmt(session.closing_amount)} · Esperado: {fmt(expectedCash)}
            </p>
          </div>
        )}

        {session.mismatch === false && !session.is_active && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            Arqueo cuadrado — sin discrepancias
          </div>
        )}

        <Button variant="secondary" onClick={onClose} fullWidth>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
