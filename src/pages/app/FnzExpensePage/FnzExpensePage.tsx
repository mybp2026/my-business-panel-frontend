import { useState, useEffect, useCallback } from "react";
import { useLoaderData } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fnzExpenseApi } from "@/api/fnzExpense.api";
import {
  TimeIntervalSelector,
  intervalToDates,
} from "@/components/ui/TimeIntervalSelector";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { ExpenseDistributionChart } from "./components/ExpenseDistributionChart";
import { ExpenseBreakdownChart } from "./components/ExpenseBreakdownChart";
import { SalesVsExpensesChart } from "./components/SalesVsExpensesChart";
import { ExpenseRegistrationForm } from "./components/ExpenseRegistrationForm";
import { CategoryManagementPanel } from "./components/CategoryManagementPanel";
import { formatInCurrency } from "@/utils/purchase";

import type { TimeInterval } from "@/components/ui/TimeIntervalSelector";
import type { ExpenseAnalyticsData } from "@/interfaces/entities/FnzExpense.interface";
import type { FnzExpensePageLoaderData } from "@/router/loaders/fnzExpense.loaders";
import type { Currency } from "@/interfaces/entities/Currency.interface";

export function FnzExpensePage() {
  const { tenantId, branches, categories, currencies, exchangeRates } =
    useLoaderData() as FnzExpensePageLoaderData;
  const { user } = useAuth();
  const isAdmin = (user?.role.role_id ?? 4) < 4;

  const crcCurrency =
    currencies.find((c) => c.currency_code === "CRC") ?? currencies[0];

  const [displayCurrency, setDisplayCurrency] = useState<Currency>(
    crcCurrency ?? currencies[0],
  );
  const [interval, setInterval] = useState<TimeInterval>("30d");
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ExpenseAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { start, end } = intervalToDates(interval);
    try {
      const [fixedVsVariable, fixedBreakdown, variableBreakdown, salesVsExpenses] =
        await Promise.all([
          fnzExpenseApi.getFixedVsVariable(tenantId, start, end),
          fnzExpenseApi.getFixedBreakdown(tenantId, start, end),
          fnzExpenseApi.getVariableBreakdown(tenantId, start, end),
          fnzExpenseApi.getSalesVsExpenses(tenantId, start, end, selectedBranchId),
        ]);
      setAnalytics({
        fixedVsVariable,
        fixedBreakdown,
        variableBreakdown,
        salesVsExpenses,
      });
    } catch {
      // Keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [tenantId, interval, selectedBranchId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const totalExpenses =
    analytics?.fixedVsVariable.reduce(
      (sum, d) => sum + Number(d.total_amount),
      0,
    ) ?? 0;
  const fixedTotal =
    Number(
      analytics?.fixedVsVariable.find((d) => d.is_fixed)?.total_amount ?? 0,
    );
  const variableTotal =
    Number(
      analytics?.fixedVsVariable.find((d) => !d.is_fixed)?.total_amount ?? 0,
    );

  const fmt = (v: number) =>
    loading ? "..." : formatInCurrency(v, displayCurrency);

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Distribución y seguimiento de egresos operativos
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeIntervalSelector value={interval} onChange={setInterval} />
          {currencies.length > 0 && (
            <CurrencyToggle
              currencies={currencies}
              value={displayCurrency}
              onChange={setDisplayCurrency}
            />
          )}
        </div>
      </div>

      {/* 1. Torta principal: Fijo vs Variable */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Distribución total de gastos
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Gastos fijos vs variables en el período seleccionado
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total gastos", value: totalExpenses },
            { label: "Gastos fijos", value: fixedTotal },
            { label: "Gastos variables", value: variableTotal },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-red-50 rounded-xl p-4 text-center"
            >
              <p className="text-xs text-red-600 mb-1">{label}</p>
              <p className="text-lg font-bold text-red-700">{fmt(value)}</p>
            </div>
          ))}
        </div>

        <ExpenseDistributionChart
          data={analytics?.fixedVsVariable ?? []}
          displayCurrency={displayCurrency}
        />
      </div>

      {/* 2. Tortas de desglose en paralelo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <ExpenseBreakdownChart
            data={analytics?.fixedBreakdown ?? []}
            title="Desglose — Gastos Fijos"
            displayCurrency={displayCurrency}
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <ExpenseBreakdownChart
            data={analytics?.variableBreakdown ?? []}
            title="Desglose — Gastos Variables"
            displayCurrency={displayCurrency}
          />
        </div>
      </div>

      {/* 3. Barras: Ventas vs Gastos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <SalesVsExpensesChart
          data={analytics?.salesVsExpenses ?? []}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          displayCurrency={displayCurrency}
          isLoading={loading}
        />
      </div>

      {/* 4. Sección admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Registrar gasto
            </h2>
            <ExpenseRegistrationForm
              tenantId={tenantId}
              branches={branches}
              categories={categories}
              currencies={currencies}
              userId={user?.user_id}
              onSuccess={loadAnalytics}
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Catálogo de tipos
            </h2>
            <CategoryManagementPanel
              tenantId={tenantId}
              initialCategories={categories}
            />
          </div>
        </div>
      )}

      {/* Exchange rates disclaimer */}
      {exchangeRates.length === 0 && currencies.length > 1 && (
        <p className="text-xs text-amber-600 text-center">
          Sin tasas de cambio configuradas — los montos en moneda extranjera
          se muestran sin convertir.
        </p>
      )}
    </div>
  );
}
