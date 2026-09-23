import { useEffect, useState } from "react";

import { exchangeRateApi } from "@/api";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";

import { IconCreditCard, IconPlus, IconSettings } from "@/assets/icons";

import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  EffectiveExchangeRate,
  ExchangeRateLedgerEntry,
} from "@/interfaces/entities/ExchangeRate.interface";

interface ExchangeRatePanelProps {
  /** Oculta el historial cuando el panel se embebe donde no hace falta. */
  showLedger?: boolean;
}

const fmt = (value: string | number, decimals = 2) =>
  Number(value).toLocaleString("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const fmtDateTime = (value: string) =>
  new Date(value).toLocaleString("es-VE", {
    dateStyle: "short",
    timeStyle: "short",
  });

/**
 * Tasa de cambio USD -> VES del tenant.
 *
 * La tasa base es global (BCV, misma para todos los tenants) y el
 * diferencial es propio de cada tenant: se suma o resta a la base y
 * persiste hasta que se cargue otro valor. La tasa efectiva resultante es
 * la que aplica a TODA la aplicacion del tenant.
 *
 * El historial es un ledger inmutable: nada se edita ni se borra, cada
 * cambio de tasa o de diferencial agrega un registro.
 */
export function ExchangeRatePanel({
  showLedger = true,
}: ExchangeRatePanelProps) {
  const { user } = useAuth();
  // La tasa base es un dato global (BCV): solo superuser puede cargarla.
  // El diferencial es propio del tenant: admin y superuser pueden ajustarlo.
  const isSuperuser = user?.role.role_name === "superuser";
  const canEditDelta = isSuperuser || user?.role.role_name === "admin";

  const [effective, setEffective] = useState<EffectiveExchangeRate | null>(
    null,
  );
  const [ledger, setLedger] = useState<ExchangeRateLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseInput, setBaseInput] = useState("");
  const [deltaInput, setDeltaInput] = useState("");
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const reload = async () => {
    setIsLoading(true);
    try {
      const [eff, led] = await Promise.all([
        exchangeRateApi.getEffective().catch(() => null),
        showLedger ? exchangeRateApi.getLedger() : Promise.resolve([]),
      ]);
      setEffective(eff);
      setLedger(led);
      if (eff) {
        setBaseInput(String(Number(eff.base_rate)));
        setDeltaInput(String(Number(eff.delta)));
      }
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error cargando la tasa",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveBase = async () => {
    const rate = Number(baseInput);
    if (!rate || rate <= 0) {
      setToast({ mode: "error", message: "Ingresa una tasa mayor a 0" });
      return;
    }
    setIsSubmitting(true);
    try {
      await exchangeRateApi.setBase(rate);
      await reload();
      setToast({
        mode: "success",
        message: "Tasa base registrada. Aplica a todos los tenants.",
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error guardando la tasa",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDelta = async () => {
    const delta = Number(deltaInput);
    if (Number.isNaN(delta)) {
      setToast({ mode: "error", message: "Ingresa un diferencial válido" });
      return;
    }
    setIsSubmitting(true);
    try {
      await exchangeRateApi.setDelta(delta);
      await reload();
      setToast({
        mode: "success",
        message:
          delta === 0
            ? "Diferencial restablecido a 0"
            : `Diferencial de ${delta > 0 ? "+" : ""}${fmt(delta)} aplicado`,
      });
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error guardando el diferencial",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "effective_at",
      label: "Fecha",
      width: "22%",
      render: (value: string) => fmtDateTime(value),
    },
    {
      key: "change_kind",
      label: "Cambio",
      width: "16%",
      render: (value: string) => (
        <Badge variant={value === "base" ? "blue" : "accent"}>
          {value === "base" ? "Tasa base" : "Diferencial"}
        </Badge>
      ),
    },
    {
      key: "base_rate",
      label: "Base",
      width: "18%",
      render: (value: string) => (
        <span className="font-mono">{fmt(value)}</span>
      ),
    },
    {
      key: "delta",
      label: "Diferencial",
      width: "18%",
      render: (value: string) => {
        const n = Number(value);
        return (
          <span
            className={`font-mono ${
              n > 0
                ? "text-emerald-700"
                : n < 0
                  ? "text-red-600"
                  : "text-gray-500"
            }`}
          >
            {n > 0 ? "+" : ""}
            {fmt(n)}
          </span>
        );
      },
    },
    {
      key: "effective_rate",
      label: "Tasa aplicada",
      width: "18%",
      render: (value: string) => (
        <span className="font-mono font-semibold">{fmt(value)}</span>
      ),
    },
    { key: "source", label: "Origen", width: "8%" },
  ];

  return (
    <>
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {!isLoading && !effective && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="mb-1 font-semibold">No hay tasa de cambio cargada</p>
          <p>
            Sin la tasa USD → VES, cualquier cálculo que convierta monedas queda
            sin base. Registra la tasa base para operar.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard
          label="Tasa base (BCV)"
          value={effective ? fmt(effective.base_rate) : "—"}
          sublabel={
            effective
              ? `Vigente desde ${fmtDateTime(effective.base_at)}`
              : "Sin valor vigente"
          }
          icon={<IconSettings />}
        />
        <StatCard
          label="Diferencial del tenant"
          value={
            effective
              ? `${Number(effective.delta) > 0 ? "+" : ""}${fmt(effective.delta)}`
              : "—"
          }
          sublabel={
            effective?.delta_at
              ? `Aplicado ${fmtDateTime(effective.delta_at)}`
              : "Sin diferencial (0)"
          }
          icon={<IconCreditCard />}
        />
        <StatCard
          label="Tasa aplicada"
          value={effective ? fmt(effective.effective_rate) : "—"}
          sublabel="Bs. por USD en todo el sistema"
          icon={<IconCreditCard />}
          accent
        />
      </div>

      {(isSuperuser || canEditDelta) && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isSuperuser && (
            <div className="rounded-2xl border border-gray-300 bg-white p-6">
              <h3 className="mb-1 text-base font-semibold text-gray-900">
                Tasa base
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                La tasa del BCV. Es global: al cambiarla, aplica a todos los
                tenants. En producción se carga automáticamente; este campo es
                para ambientes sin el job automático. Cada carga queda
                registrada en el historial.
              </p>
              <div className="flex items-end gap-3">
                <Input
                  label="Bs. por USD"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={baseInput}
                  onChange={(e) => setBaseInput(e.target.value)}
                />
                <Button onClick={handleSaveBase} loading={isSubmitting}>
                  <IconPlus />
                  Registrar
                </Button>
              </div>
            </div>
          )}

          {canEditDelta && (
            <div className="rounded-2xl border border-gray-300 bg-white p-6">
              <h3 className="mb-1 text-base font-semibold text-gray-900">
                Diferencial
              </h3>
              <div className="flex items-end gap-3">
                <Input
                  label="Bs. (+/-)"
                  type="number"
                  step="0.000001"
                  value={deltaInput}
                  onChange={(e) => setDeltaInput(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={handleSaveDelta}
                  loading={isSubmitting}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showLedger && (
        <div className="rounded-2xl border border-gray-300 bg-white p-6">
          <h3 className="mb-1 text-base font-semibold text-gray-900">
            Historial de tasas
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            Registro inmutable: nada se edita ni se borra. Cada cambio de tasa
            base o de diferencial agrega una fila.
          </p>
          <Table
            columns={columns}
            data={ledger}
            isLoading={isLoading}
            emptyMessage="Sin movimientos de tasa todavía."
          />
        </div>
      )}
    </>
  );
}
