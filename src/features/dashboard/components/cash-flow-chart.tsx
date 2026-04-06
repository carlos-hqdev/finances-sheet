"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthData = {
  month: string;
  income: number;
  expense: number;
};

type ChartData = MonthData & { result: number; label: string };

interface CashFlowChartProps {
  data: MonthData[];
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Abr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

// Tick customizado — usa fill="currentColor" para herdar a cor do tema via CSS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function XAxisTick({ x, y, payload }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill="currentColor"
        className="text-[#525252] dark:text-muted-foreground"
        fontSize={11}
      >
        {payload.value}
      </text>
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function YAxisTick({ x, y, payload }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="currentColor"
        className="text-[#525252] dark:text-muted-foreground"
        fontSize={10}
      >
        {formatBRL(payload.value)}
      </text>
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-sm shadow-lg">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium" style={{ color: entry.color }}>
            {formatBRL(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData: ChartData[] = useMemo(
    () =>
      data.map((d) => {
        const [year, month] = d.month.split("-");
        return {
          ...d,
          result: d.income - d.expense,
          label: `${MONTH_LABELS[month] ?? month}/${year?.slice(2)}`,
        };
      }),
    [data],
  );

  // Stats
  const last = chartData[chartData.length - 1];
  const totalIncome = chartData.reduce((s, d) => s + d.income, 0);
  const totalExpense = chartData.reduce((s, d) => s + d.expense, 0);
  const maxIncomeMonth = chartData.reduce(
    (best, d) => (d.income > best.income ? d : best),
    chartData[0] ?? { income: 0, label: "-" },
  );
  const resultAccumulated = totalIncome - totalExpense;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBadge
          label="Mês Atual"
          value={formatBRL(last?.result ?? 0)}
          color={last?.result >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <StatBadge
          label="Maior Receita"
          value={formatBRL(maxIncomeMonth?.income ?? 0)}
          sub={maxIncomeMonth?.label}
          color="text-emerald-500"
        />
        <StatBadge
          label="Total Despesas"
          value={formatBRL(totalExpense)}
          color="text-red-500"
        />
        <StatBadge
          label="Resultado Acumulado"
          value={formatBRL(resultAccumulated)}
          color={resultAccumulated >= 0 ? "text-emerald-500" : "text-red-500"}
        />
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-55">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            {/* stroke com opacidade neutra — funciona nos dois temas */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={<XAxisTick />}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={<YAxisTick />}
              axisLine={false}
              tickLine={false}
              width={78}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "currentColor", opacity: 0.05 }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-muted-foreground text-xs">{value}</span>
              )}
            />
            <Bar
              dataKey="income"
              name="Receita"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="expense"
              name="Despesa"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Line
              type="monotone"
              dataKey="result"
              name="Resultado"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#3b82f6" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatBadge({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${color ?? "text-foreground"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
