import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { FixedVsVariableAnalytic } from "@/interfaces/entities/FnzExpense.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import { formatInCurrency } from "@/utils/purchase";

const COLORS: Record<string, string> = {
  Fijo: "#ef4444",
  Variable: "#f97316",
};

interface Props {
  data: FixedVsVariableAnalytic[];
  displayCurrency: Currency;
}

export function ExpenseDistributionChart({ data, displayCurrency }: Props) {
  const nonZero = data.filter((d) => Number(d.total_amount) > 0);

  if (!nonZero.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Sin datos para el período seleccionado
      </p>
    );
  }

  const chartData = nonZero.map((d) => ({
    name: d.expense_type,
    value: Number(d.total_amount),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
          }
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={COLORS[entry.name] ?? "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [
            formatInCurrency(Number(value ?? 0), displayCurrency),
            "Total",
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
