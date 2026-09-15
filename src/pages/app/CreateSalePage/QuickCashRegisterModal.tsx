import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";

import { useAuth } from "@/context/AuthContext";

import {
  closeCashRegisterSession,
  getCashRegistersByBranch,
  getOpenCashSessionsByBranch,
  startCashRegisterSession,
} from "@/router/actions/cashRegister.actions";

import type {
  CashRegister,
  CashRegisterSession,
} from "@/interfaces/entities/CashRegister.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

interface Props {
  isOpen: boolean;
  branchId: string;
  branchName?: string;
  onClose: () => void;
  onSessionsChanged: () => void | Promise<void>;
}

interface RegisterRow {
  register: CashRegister;
  session: CashRegisterSession | null;
}

const formatAmount = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2 });

export function QuickCashRegisterModal({
  isOpen,
  branchId,
  branchName,
  onClose,
  onSessionsChanged,
}: Props) {
  const { user } = useAuth();
  const roleName = user?.role.role_name ?? "";
  // Admin and superuser bypass the key check both client-side and server-side.
  const requiresKey = roleName !== "admin" && roleName !== "superuser";

  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyRegisterId, setBusyRegisterId] = useState<string | null>(null);
  const [amountByRegister, setAmountByRegister] = useState<
    Record<string, string>
  >({});
  const [breakdownByRegister, setBreakdownByRegister] = useState<
    Record<
      string,
      { cash: string; debit: string; credit: string; transfer: string }
    >
  >({});
  const [keyByRegister, setKeyByRegister] = useState<Record<string, string>>(
    {},
  );
  const [closedReport, setClosedReport] = useState<CashRegisterSession | null>(
    null,
  );
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const refresh = async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const [registers, openSessions] = await Promise.all([
        getCashRegistersByBranch(branchId),
        getOpenCashSessionsByBranch(branchId),
      ]);
      const sessionByRegister = new Map(
        openSessions.map((s) => [s.cash_register_id, s] as const),
      );
      setRows(
        registers.map((register) => ({
          register,
          session: sessionByRegister.get(register.cash_register_id) ?? null,
        })),
      );
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al cargar las cajas registradoras",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setClosedReport(null);
      return;
    }
    setAmountByRegister({});
    setBreakdownByRegister({});
    setKeyByRegister({});
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, branchId]);

  const setAmount = (registerId: string, value: string) =>
    setAmountByRegister((prev) => ({ ...prev, [registerId]: value }));

  const setBreakdown = (
    registerId: string,
    method: "cash" | "debit" | "credit" | "transfer",
    value: string,
  ) =>
    setBreakdownByRegister((prev) => ({
      ...prev,
      [registerId]: {
        ...(prev[registerId] || {
          cash: "",
          debit: "",
          credit: "",
          transfer: "",
        }),
        [method]: value,
      },
    }));

  const getBreakdown = (registerId: string) =>
    breakdownByRegister[registerId] || {
      cash: "",
      debit: "",
      credit: "",
      transfer: "",
    };

  const calculateTotal = (registerId: string) => {
    const b = getBreakdown(registerId);
    return (
      (parseAmount(b.cash) || 0) +
      (parseAmount(b.debit) || 0) +
      (parseAmount(b.credit) || 0) +
      (parseAmount(b.transfer) || 0)
    );
  };

  const setKey = (registerId: string, value: string) =>
    setKeyByRegister((prev) => ({ ...prev, [registerId]: value }));

  const parseAmount = (raw: string | undefined): number | null => {
    if (raw === undefined || raw === "") return null;
    const value = Number(raw.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  };

  const handleOpen = async (row: RegisterRow) => {
    const amount = parseAmount(amountByRegister[row.register.cash_register_id]);
    if (amount === null) {
      setToast({
        mode: "error",
        message: "Ingrese un monto de apertura válido",
      });
      return;
    }
    const key = (keyByRegister[row.register.cash_register_id] ?? "").trim();
    if (requiresKey && !key) {
      setToast({
        mode: "error",
        message: "Ingrese la clave de la caja para abrir la sesión",
      });
      return;
    }
    setBusyRegisterId(row.register.cash_register_id);
    try {
      await startCashRegisterSession(
        row.register.cash_register_id,
        amount,
        undefined,
        requiresKey ? key : undefined,
      );
      setToast({
        mode: "success",
        message: `Sesión abierta en ${row.register.register_name}`,
      });
      setKey(row.register.cash_register_id, "");
      await refresh();
      await onSessionsChanged();
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error al abrir la sesión",
      });
    } finally {
      setBusyRegisterId(null);
    }
  };

  const handleClose = async (row: RegisterRow) => {
    if (!row.session) return;
    const b = getBreakdown(row.register.cash_register_id);
    const total = calculateTotal(row.register.cash_register_id);

    if (total <= 0) {
      setToast({
        mode: "error",
        message: "Ingrese los montos de cierre por método de pago",
      });
      return;
    }

    const key = (keyByRegister[row.register.cash_register_id] ?? "").trim();
    if (requiresKey && !key) {
      setToast({
        mode: "error",
        message: "Ingrese la clave de la caja para cerrar la sesión",
      });
      return;
    }
    if (!confirm(`¿Cerrar la sesión activa de ${row.register.register_name}?`))
      return;

    setBusyRegisterId(row.register.cash_register_id);
    try {
      const closed = await closeCashRegisterSession(
        row.session.cash_register_session_id,
        total,
        {
          cash: parseAmount(b.cash) || 0,
          debit: parseAmount(b.debit) || 0,
          credit: parseAmount(b.credit) || 0,
          transfer: parseAmount(b.transfer) || 0,
        },
        undefined,
        requiresKey ? key : undefined,
      );
      setKey(row.register.cash_register_id, "");
      await refresh();
      await onSessionsChanged();
      if (closed) setClosedReport(closed);
      setToast({
        mode: "success",
        message: `Sesión cerrada en ${row.register.register_name}`,
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error al cerrar la sesión",
      });
    } finally {
      setBusyRegisterId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cajas${branchName ? ` · ${branchName}` : ""}`}
      size="md"
    >
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          La sucursal no tiene cajas registradoras configuradas.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isBusy = busyRegisterId === row.register.cash_register_id;
            const isActive = !!row.session;
            const amountValue =
              amountByRegister[row.register.cash_register_id] ?? "";

            return (
              <div
                key={row.register.cash_register_id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {row.register.register_name ||
                        row.register.cash_register_id}
                    </p>
                    {isActive && row.session && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Apertura: Bs. {formatAmount(row.session.opening_amount)} ·{" "}
                        {new Date(row.session.opened_at).toLocaleString(
                          "es-CR",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive ? (
                      <Badge variant="green">Abierta</Badge>
                    ) : (
                      <Badge variant="gray">Cerrada</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {isActive ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Efectivo"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={getBreakdown(row.register.cash_register_id).cash}
                        onChange={(e) =>
                          setBreakdown(
                            row.register.cash_register_id,
                            "cash",
                            e.target.value,
                          )
                        }
                        disabled={isBusy}
                      />
                      <Input
                        label="T. Débito"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={
                          getBreakdown(row.register.cash_register_id).debit
                        }
                        onChange={(e) =>
                          setBreakdown(
                            row.register.cash_register_id,
                            "debit",
                            e.target.value,
                          )
                        }
                        disabled={isBusy}
                      />
                      <Input
                        label="T. Crédito"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={
                          getBreakdown(row.register.cash_register_id).credit
                        }
                        onChange={(e) =>
                          setBreakdown(
                            row.register.cash_register_id,
                            "credit",
                            e.target.value,
                          )
                        }
                        disabled={isBusy}
                      />
                      <Input
                        label="Transferencia"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={
                          getBreakdown(row.register.cash_register_id).transfer
                        }
                        onChange={(e) =>
                          setBreakdown(
                            row.register.cash_register_id,
                            "transfer",
                            e.target.value,
                          )
                        }
                        disabled={isBusy}
                      />
                    </div>
                  ) : (
                    <Input
                      label="Monto de apertura"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={amountValue}
                      onChange={(e) =>
                        setAmount(row.register.cash_register_id, e.target.value)
                      }
                      disabled={isBusy}
                      required
                    />
                  )}

                  <div className="flex items-center justify-between gap-4">
                    {isActive && (
                      <div className="text-sm font-medium text-gray-700">
                        Total cierre:{" "}
                        <span className="font-mono text-gray-900">
                          Bs.{" "}
                          {calculateTotal(
                            row.register.cash_register_id,
                          ).toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 flex justify-end">
                      {isActive ? (
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleClose(row)}
                          loading={isBusy}
                          fullWidth
                        >
                          Cerrar Caja
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => handleOpen(row)}
                          loading={isBusy}
                          fullWidth
                        >
                          Abrir Caja
                        </Button>
                      )}
                    </div>
                  </div>
                  {requiresKey && (
                    <Input
                      label="Clave de la caja"
                      type="password"
                      placeholder="Solicítala al administrador"
                      value={keyByRegister[row.register.cash_register_id] ?? ""}
                      onChange={(e) =>
                        setKey(row.register.cash_register_id, e.target.value)
                      }
                      disabled={isBusy}
                      required
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {closedReport && (
        <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              Reporte de arqueo — {closedReport.register_name ?? ""}
            </p>
            <button
              type="button"
              onClick={() => setClosedReport(null)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Ocultar
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1.5 text-sm">
            {closedReport.payment_method_sales &&
            closedReport.payment_method_sales.length > 0
              ? closedReport.payment_method_sales.map((method) => (
                  <div
                    key={method.payment_method_id}
                    className="flex justify-between"
                  >
                    <span className="text-gray-500 capitalize">
                      {method.payment_method_name.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-gray-800">
                      Bs.{" "}
                      {Number(method.total_amount).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))
              : [
                  ["Efectivo", closedReport.cash_sales_amount],
                  ["Tarjeta débito", closedReport.debit_sales_amount],
                  ["Tarjeta crédito", closedReport.credit_sales_amount],
                  ["Transferencia", closedReport.transfer_sales_amount],
                  ["Puntos de fidelidad", closedReport.points_sales_amount],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-mono text-gray-800">
                      {val == null
                        ? "—"
                        : `Bs. ${Number(val).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                ))}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
              <span className="text-gray-700">Total ventas</span>
              <span className="font-mono text-gray-900">
                {closedReport.total_sales_amount == null
                  ? "—"
                  : `Bs. ${Number(closedReport.total_sales_amount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>

          {closedReport.mismatch && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                closedReport.mismatch_type === "surplus"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <p className="font-semibold">
                Discrepancia:{" "}
                {closedReport.mismatch_type === "surplus"
                  ? "Excedente"
                  : "Faltante"}
              </p>
              <p className="font-mono text-lg font-bold mt-0.5">
                {closedReport.mismatch_type === "surplus" ? "+" : "-"}Bs.{" "}
                {Number(closedReport.mismatch_amount ?? 0).toLocaleString(
                  "es-VE",
                  { minimumFractionDigits: 2 },
                )}
              </p>
            </div>
          )}

          {closedReport.mismatch === false && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              Arqueo cuadrado — sin discrepancias
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
