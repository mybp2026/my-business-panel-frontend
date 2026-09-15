import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLoaderData } from "react-router-dom";

import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Pagination } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { IconEdit, IconEye, IconTrash } from "@/assets/icons";

import {
  getCashRegistersByBranches,
  getCashSessions,
  type CashSessionsPageLoaderData,
} from "@/router/loaders/cashRegister.loaders";
import {
  closeCashRegisterSession,
  createCashRegister,
  startCashRegisterSession,
} from "@/router/actions/cashRegister.actions";
import { cashRegisterApi } from "@/api/cashRegister.api";

import type {
  CashRegister,
  CashRegisterSession,
} from "@/interfaces/entities/CashRegister.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { CashSessionModal } from "./CashSessionModal";
import { CashRegisterEditModal } from "./CashRegisterEditModal";

type StatusFilter = "all" | "active" | "inactive";
type SessionAction = "open" | "close";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Cerradas" },
];

const ACTION_OPTIONS: { value: SessionAction; label: string }[] = [
  { value: "open", label: "Abrir sesion" },
  { value: "close", label: "Cerrar sesion" },
];

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("es-VE") : "-";

const formatCurrency = (value?: number | null) =>
  value === undefined || value === null
    ? "-"
    : `Bs. ${Number(value).toLocaleString("es-VE", {
        minimumFractionDigits: 2,
      })}`;

const sortByOpenedDesc = (data: CashRegisterSession[]) =>
  [...data].sort(
    (a, b) =>
      new Date(b.opened_at ?? 0).getTime() -
      new Date(a.opened_at ?? 0).getTime(),
  );

const parseAmount = (rawAmount: string) => {
  const normalized = rawAmount.trim().replace(",", ".");
  return Number(normalized);
};

const normalizeRegisterName = (name: string) => name.trim();

export function CashSessionsPage() {
  const { branches, initialSessions, initialRegisters } =
    useLoaderData() as CashSessionsPageLoaderData;

  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [actionType, setActionType] = useState<SessionAction>("open");
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [amount, setAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [registers, setRegisters] = useState<CashRegister[]>(initialRegisters);
  const [newRegisterBranchId, setNewRegisterBranchId] = useState(
    branches[0]?.branch_id ?? "",
  );
  const [newRegisterName, setNewRegisterName] = useState("");
  const [newRegisterKey, setNewRegisterKey] = useState("");
  const [newRegisterIsActive, setNewRegisterIsActive] = useState(true);

  const [sessions, setSessions] = useState<CashRegisterSession[]>(
    sortByOpenedDesc(initialSessions),
  );
  const [sessionsForActions, setSessionsForActions] = useState<
    CashRegisterSession[]
  >(sortByOpenedDesc(initialSessions));

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingRegister, setIsCreatingRegister] = useState(false);

  const [sessionModal, setSessionModal] = useState<CashRegisterSession | null>(
    null,
  );
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  // Admin cash registers table state
  const [adminRegisters, setAdminRegisters] = useState<CashRegister[]>([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminPage, setAdminPage] = useState(1);
  const [adminPages, setAdminPages] = useState(1);
  const [adminBranchFilter, setAdminBranchFilter] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<
    "" | "true" | "false"
  >("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(
    null,
  );
  const [viewRegister, setViewRegister] = useState<CashRegister | null>(null);

  const loadAdminRegisters = async (page = 1) => {
    setAdminLoading(true);
    try {
      const res = await cashRegisterApi.listPaginated({
        branchId: adminBranchFilter || undefined,
        isActive:
          adminStatusFilter === "" ? undefined : adminStatusFilter === "true",
        page,
        limit: 10,
      });
      setAdminRegisters(res.results);
      setAdminTotal(res.total);
      setAdminPages(Math.ceil(res.total / res.limit));
    } catch {
      // silent
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminRegisters(adminPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminBranchFilter, adminStatusFilter, adminPage]);

  const handleDeleteRegister = async (reg: CashRegister) => {
    if (
      !confirm(
        `¿Está seguro de eliminar la caja "${reg.register_name}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      await cashRegisterApi.remove(reg.cash_register_id);
      setToast({ mode: "success", message: "Caja eliminada correctamente" });
      void loadAdminRegisters(adminPage);
      await refreshRegisters();
    } catch (e: unknown) {
      setToast({
        mode: "error",
        message: e instanceof Error ? e.message : "Error al eliminar caja",
      });
    }
  };

  const isFirstTableRender = useRef(true);
  const isFirstActionRender = useRef(true);

  useEffect(() => {
    if (isFirstTableRender.current) {
      isFirstTableRender.current = false;
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const isActive =
      status === "all" ? null : status === "active" ? true : false;

    getCashSessions({
      branchId: branchId || undefined,
      isActive,
    })
      .then((res) => {
        if (cancelled) return;
        setSessions(sortByOpenedDesc(res));
      })
      .catch((err) => {
        setToast({
          mode: "error",
          message:
            err instanceof Error ? err.message : "Error al cargar sesiones",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, status]);

  useEffect(() => {
    if (isFirstActionRender.current) {
      isFirstActionRender.current = false;
      return;
    }

    let cancelled = false;

    getCashSessions({
      branchId: branchId || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setSessionsForActions(sortByOpenedDesc(res));
      })
      .catch((err) => {
        setToast({
          mode: "error",
          message:
            err instanceof Error
              ? err.message
              : "Error al cargar sesiones de caja",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!newRegisterBranchId && branchId) {
      setNewRegisterBranchId(branchId);
    }
  }, [branchId, newRegisterBranchId]);

  const branchNameById = useMemo(
    () =>
      new Map(branches.map((branch) => [branch.branch_id, branch.branch_name])),
    [branches],
  );

  const availableRegisters = useMemo(() => {
    const source = branchId
      ? registers.filter((register) => register.branch_id === branchId)
      : registers;

    return [...source].sort((a, b) => {
      const branchA = branchNameById.get(a.branch_id) ?? "";
      const branchB = branchNameById.get(b.branch_id) ?? "";
      const byBranch = branchA.localeCompare(branchB, "es");
      if (byBranch !== 0) return byBranch;
      return a.register_name.localeCompare(b.register_name, "es");
    });
  }, [branchId, branchNameById, registers]);

  useEffect(() => {
    if (
      selectedRegisterId &&
      !availableRegisters.some(
        (register) => register.cash_register_id === selectedRegisterId,
      )
    ) {
      setSelectedRegisterId("");
    }
  }, [availableRegisters, selectedRegisterId]);

  const registerOptions = [
    {
      value: "",
      label: availableRegisters.length
        ? "Seleccione una caja"
        : "No hay cajas disponibles",
    },
    ...availableRegisters.map((register) => ({
      value: register.cash_register_id,
      label: `${register.register_name} - ${branchNameById.get(register.branch_id) ?? "Sucursal"}`,
    })),
  ];

  const activeSessionByRegister = useMemo(() => {
    const map = new Map<string, CashRegisterSession>();
    for (const session of sessionsForActions) {
      if (session.is_active && !map.has(session.cash_register_id)) {
        map.set(session.cash_register_id, session);
      }
    }
    return map;
  }, [sessionsForActions]);

  const selectedActiveSession = selectedRegisterId
    ? (activeSessionByRegister.get(selectedRegisterId) ?? null)
    : null;

  const canOpen = !!selectedRegisterId && !selectedActiveSession;
  const canClose = !!selectedRegisterId && !!selectedActiveSession;

  const amountValue = parseAmount(amount);
  const isAmountValid = Number.isFinite(amountValue) && amountValue > 0;

  const actionIsBlocked = actionType === "open" ? !canOpen : !canClose;

  const refreshSessions = async () => {
    const isActive =
      status === "all" ? null : status === "active" ? true : false;

    const [tableSessions, allSessions] = await Promise.all([
      getCashSessions({
        branchId: branchId || undefined,
        isActive,
      }),
      getCashSessions({
        branchId: branchId || undefined,
      }),
    ]);

    setSessions(sortByOpenedDesc(tableSessions));
    setSessionsForActions(sortByOpenedDesc(allSessions));
  };

  const refreshRegisters = async () => {
    const refreshed = await getCashRegistersByBranches(branches);
    setRegisters(refreshed);
  };

  const handleCreateRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const safeRegisterName = normalizeRegisterName(newRegisterName);

    if (!newRegisterBranchId) {
      setToast({
        mode: "error",
        message: "Seleccione una sucursal para crear la caja",
      });
      return;
    }

    if (!safeRegisterName) {
      setToast({
        mode: "error",
        message: "Ingrese un nombre para la caja registradora",
      });
      return;
    }

    setIsCreatingRegister(true);

    try {
      await createCashRegister({
        branchId: newRegisterBranchId,
        registerName: safeRegisterName,
        isActive: newRegisterIsActive,
        cashRegisterKey: newRegisterKey.trim() || null,
      });

      await refreshRegisters();
      setNewRegisterName("");
      setNewRegisterKey("");
      setNewRegisterIsActive(true);

      setToast({
        mode: "success",
        message: "Caja registradora creada correctamente",
      });
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo crear la caja registradora",
      });
    } finally {
      setIsCreatingRegister(false);
    }
  };

  const handleSessionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRegisterId) {
      setToast({
        mode: "error",
        message: "Seleccione una caja antes de continuar",
      });
      return;
    }

    const totalClosingAmount =
      (parseAmount(cashAmount) || 0) +
      (parseAmount(debitAmount) || 0) +
      (parseAmount(creditAmount) || 0) +
      (parseAmount(transferAmount) || 0);

    const isCurrentAmountValid =
      actionType === "open" ? isAmountValid : totalClosingAmount > 0;

    if (!isCurrentAmountValid) {
      setToast({
        mode: "error",
        message: "Ingrese un monto válido mayor que cero",
      });
      return;
    }

    if (actionType === "open" && selectedActiveSession) {
      setToast({
        mode: "error",
        message: "La caja seleccionada ya tiene una sesion abierta",
      });
      return;
    }

    if (actionType === "close" && !selectedActiveSession) {
      setToast({
        mode: "error",
        message: "La caja seleccionada no tiene sesion activa para cerrar",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (actionType === "open") {
        await startCashRegisterSession(selectedRegisterId, amountValue);
      } else {
        const closedSession = await closeCashRegisterSession(
          selectedActiveSession!.cash_register_session_id,
          totalClosingAmount,
          {
            cash: parseAmount(cashAmount) || 0,
            debit: parseAmount(debitAmount) || 0,
            credit: parseAmount(creditAmount) || 0,
            transfer: parseAmount(transferAmount) || 0,
          },
        );

        setIsLoading(true);
        await refreshSessions();
        setAmount("");
        setCashAmount("");
        setDebitAmount("");
        setCreditAmount("");
        setTransferAmount("");

        setToast({
          mode: "success",
          message: "Sesion de caja cerrada correctamente",
        });

        if (closedSession) setSessionModal(closedSession);
        return;
      }

      setIsLoading(true);
      await refreshSessions();
      setAmount("");

      setToast({
        mode: "success",
        message: "Sesion de caja abierta correctamente",
      });
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error ? err.message : "No se pudo procesar la sesion",
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const branchFilterOptions = [
    { value: "", label: "Todas las sucursales" },
    ...branches.map((b) => ({ value: b.branch_id, label: b.branch_name })),
  ];

  const branchCreateOptions = branches.map((branch) => ({
    value: branch.branch_id,
    label: branch.branch_name,
  }));

  const columns: Column[] = [
    {
      key: "opened_at",
      label: "Apertura",
      width: "16%",
      render: (v: string) => formatDate(v),
    },
    {
      key: "closed_at",
      label: "Cierre",
      width: "16%",
      render: (v: string) => formatDate(v),
    },
    { key: "register_name", label: "Caja", width: "14%" },
    { key: "branch_name", label: "Sucursal", width: "14%" },
    {
      key: "opening_amount",
      label: "Monto inicial",
      width: "12%",
      render: (v: number) => formatCurrency(v),
    },
    {
      key: "closing_amount",
      label: "Monto final",
      width: "12%",
      render: (v: number) => formatCurrency(v),
    },
    {
      key: "is_active",
      label: "Estado",
      width: "10%",
      render: (v: boolean) => (
        <Badge variant={v ? "green" : "gray"}>{v ? "Activa" : "Cerrada"}</Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "8%",
      render: (_: unknown, row: CashRegisterSession) =>
        row.is_active ? null : (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              title="Ver reporte de turno"
              onClick={() => setSessionModal(row)}
            >
              <IconEye />
            </Button>
          </div>
        ),
    },
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sesiones de caja
        </h1>
        <p className="text-gray-600">
          Administre cajas registradoras y sus sesiones por sucursal.
        </p>
      </div>

      <form
        onSubmit={handleCreateRegister}
        className="bg-white rounded-2xl border border-gray-300 p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Crear caja</h2>
          <span className="text-sm text-gray-500">
            {registers.length} caja{registers.length !== 1 ? "s" : ""} en total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Sucursal"
            value={newRegisterBranchId}
            onChange={(e) => setNewRegisterBranchId(e.target.value)}
            options={branchCreateOptions}
            required
          />
          <Input
            label="Nombre de caja"
            placeholder="Ej: Caja principal"
            value={newRegisterName}
            onChange={(e) => setNewRegisterName(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="Contraseña de apertura y cierre de caja"
            value={newRegisterKey}
            onChange={(e) => setNewRegisterKey(e.target.value)}
          />
          <div className="flex items-end justify-end">
            <Button type="submit" loading={isCreatingRegister}>
              Crear caja
            </Button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Sesiones de caja
            </h2>
            <span className="text-sm text-gray-500">
              {sessions.length} sesion{sessions.length !== 1 ? "es" : ""}
            </span>
          </div>

          <form onSubmit={handleSessionSubmit} className="space-y-4">
            <div
              className={`grid grid-cols-1 ${actionType === "close" ? "md:grid-cols-6" : "md:grid-cols-4"} gap-3 items-end`}
            >
              <Select
                label="Caja"
                value={selectedRegisterId}
                onChange={(e) => setSelectedRegisterId(e.target.value)}
                options={registerOptions}
                required
              />
              <Select
                label="Acción"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as SessionAction)}
                options={ACTION_OPTIONS}
              />

              {actionType === "open" ? (
                <Input
                  label="Monto de apertura"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              ) : (
                <>
                  <Input
                    label="Efectivo"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                  />
                  <Input
                    label="Débito"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                  />
                  <Input
                    label="Crédito"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                  <Input
                    label="Transferencia"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </>
              )}

              <div
                className={`${actionType === "close" ? "md:col-span-6" : ""} flex justify-end items-center gap-4`}
              >
                {actionType === "close" && (
                  <div className="text-sm font-medium text-gray-700">
                    Total cierre:{" "}
                    <span className="font-mono text-gray-900">
                      Bs.{" "}
                      {(
                        (parseAmount(cashAmount) || 0) +
                        (parseAmount(debitAmount) || 0) +
                        (parseAmount(creditAmount) || 0) +
                        (parseAmount(transferAmount) || 0)
                      ).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <Button
                  type="submit"
                  size="md"
                  loading={isSubmitting}
                  disabled={
                    actionIsBlocked ||
                    (actionType === "open" && !isAmountValid) ||
                    (actionType === "close" &&
                      (parseAmount(cashAmount) || 0) +
                        (parseAmount(debitAmount) || 0) +
                        (parseAmount(creditAmount) || 0) +
                        (parseAmount(transferAmount) || 0) <=
                        0)
                  }
                >
                  {actionType === "open" ? "Abrir sesión" : "Cerrar sesión"}
                </Button>
              </div>
            </div>

            {/* {(selectedRegisterStateMessage || formBlockedMessage) && (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-gray-500">
                  {selectedRegisterStateMessage}
                </p>
                {formBlockedMessage && (
                  <p className="text-sm text-red-500">{formBlockedMessage}</p>
                )}
              </div>
            )} */}
          </form>

          {/* Filtros de tabla */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Sucursal"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={branchFilterOptions}
            />
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="p-6">
          <Table
            columns={columns}
            data={sessions}
            isLoading={isLoading}
            emptyMessage="No hay sesiones de caja registradas"
            onRowClick={(row) => setSessionModal(row)}
          />
        </div>
      </div>

      {/* ── Admin: Cajas registradoras ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-300 mt-6 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Administración de cajas registradoras
            </h2>
            <span className="text-sm text-gray-500">
              {adminTotal} caja{adminTotal !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Filtrar por sucursal"
              value={adminBranchFilter}
              onChange={(e) => {
                setAdminBranchFilter(e.target.value);
                setAdminPage(1);
              }}
              options={[
                { value: "", label: "Todas las sucursales" },
                ...branches.map((b) => ({
                  value: b.branch_id,
                  label: b.branch_name,
                })),
              ]}
            />
            <Select
              label="Estado"
              value={adminStatusFilter}
              onChange={(e) => {
                setAdminStatusFilter(e.target.value as "" | "true" | "false");
                setAdminPage(1);
              }}
              options={[
                { value: "", label: "Todas" },
                { value: "true", label: "Activas" },
                { value: "false", label: "Inactivas" },
              ]}
            />
          </div>
        </div>
        <div className="p-6">
          <Table
            columns={[
              { key: "register_name", label: "Nombre", width: "25%" },
              {
                key: "branch_name",
                label: "Sucursal",
                width: "25%",
                render: (v: string) => v ?? "—",
              },
              {
                key: "is_active",
                label: "Estado",
                width: "14%",
                render: (v: boolean) => (
                  <Badge variant={v ? "green" : "gray"}>
                    {v ? "Activa" : "Inactiva"}
                  </Badge>
                ),
              },
              {
                key: "created_at",
                label: "Creada",
                width: "18%",
                render: (v: string) => formatDate(v),
              },
              {
                key: "actions",
                label: "Acciones",
                width: "18%",
                render: (_: unknown, row: CashRegister) => (
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Ver detalle"
                      onClick={() => setViewRegister(row)}
                    >
                      <IconEye />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Editar"
                      onClick={() => setEditingRegister(row)}
                    >
                      <IconEdit />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      title="Eliminar"
                      onClick={() => void handleDeleteRegister(row)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={adminRegisters}
            isLoading={adminLoading}
            emptyMessage="No hay cajas registradoras"
          />
          {adminPages > 1 && (
            <Pagination
              page={adminPage}
              totalPages={adminPages}
              onPageChange={setAdminPage}
              loading={adminLoading}
            />
          )}
        </div>
      </div>

      <CashSessionModal
        session={sessionModal}
        onClose={() => setSessionModal(null)}
      />

      {editingRegister && (
        <CashRegisterEditModal
          register={editingRegister}
          branches={branches}
          onClose={() => setEditingRegister(null)}
          onSaved={(updated) => {
            setEditingRegister(null);
            setAdminRegisters((prev) =>
              prev.map((r) =>
                r.cash_register_id === updated.cash_register_id ? updated : r,
              ),
            );
            setToast({ mode: "success", message: "Caja actualizada" });
            void refreshRegisters();
          }}
        />
      )}

      {viewRegister && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setViewRegister(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Detalle de caja
            </h3>
            <div className="space-y-3 text-sm">
              {[
                ["ID", viewRegister.cash_register_id],
                ["Nombre", viewRegister.register_name],
                ["Estado", viewRegister.is_active ? "Activa" : "Inactiva"],
                ["Creada", formatDate(viewRegister.created_at)],
                ["Actualizada", formatDate(viewRegister.updated_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    {label}
                  </p>
                  <p className="text-gray-900 font-mono text-xs break-all">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setViewRegister(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
