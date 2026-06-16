import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CategoryAnalytic } from "@/interfaces/entities/FnzExpense.interface";
import type { Currency } from "@/interfaces/entities/Currency.interface";
import { formatInCurrency } from "@/utils/purchase";

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

interface Props {
  data: CategoryAnalytic[];
  title: string;
  displayCurrency: Currency;
}

export function ExpenseBreakdownChart({ data, title, displayCurrency }: Props) {
  const nonZero = data.filter((d) => Number(d.total_amount) > 0);

  if (!nonZero.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>
        <p className="text-xs text-gray-400">Sin gastos en el período</p>
      </div>
    );
  }

  const chartData = nonZero.map((d) => ({
    name: d.category_name,
    value: Number(d.total_amount),
  }));

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={80}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [
              formatInCurrency(Number(value ?? 0), displayCurrency),
              "Total",
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
