import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Select } from "@/components/ui/Select";
import type { SalesVsExpensesPoint } from "@/interfaces/entities/FnzExpense.interface";
import type { Branch } from "@/interfaces/entities/Branch.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import { formatInCurrency } from "@/utils/purchase";

interface Props {
  data: SalesVsExpensesPoint[];
  branches: Branch[];
  selectedBranchId: string | null;
  onBranchChange: (id: string | null) => void;
  displayCurrency: Currency;
  isLoading: boolean;
}

export function SalesVsExpensesChart({
  data,
  branches,
  selectedBranchId,
  onBranchChange,
  displayCurrency,
  isLoading,
}: Props) {
  const branchOptions = [
    { value: "", label: "Todas las sucursales" },
    ...branches.map((b) => ({ value: b.branch_id, label: b.branch_name })),
  ];

  const chartData = data.map((d) => ({
    period: d.period.slice(0, 10),
    ventas: Number(d.total_sales),
    gastos: Number(d.total_expenses),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">Ventas vs Gastos</p>
        <div className="w-52">
          <Select
            label=""
            value={selectedBranchId ?? ""}
            onChange={(e) => onBranchChange(e.target.value || null)}
            options={branchOptions}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      ) : !chartData.length ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Sin datos para el período seleccionado
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => formatInCurrency(v, displayCurrency)}
              tick={{ fontSize: 10 }}
              width={110}
            />
            <Tooltip
              formatter={(value, name) => [
                formatInCurrency(Number(value ?? 0), displayCurrency),
                name === "ventas" ? "Ventas" : "Gastos",
              ]}
            />
            <Legend
              formatter={(value) => (value === "ventas" ? "Ventas" : "Gastos")}
            />
            <Bar
              dataKey="ventas"
              fill="#22c55e"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="gastos"
              fill="#ef4444"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
