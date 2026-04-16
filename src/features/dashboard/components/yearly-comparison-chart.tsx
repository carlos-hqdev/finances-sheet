"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

interface ComparisonData {
  month: string;
  currentIncome: number;
  previousIncome: number;
  currentExpense: number;
  previousExpense: number;
}

interface YearlyComparisonChartProps {
  data: ComparisonData[];
  years: { current: number; previous: number };
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Custom Tick for YAxis to match CashFlowChart style
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
          <span className="font-medium text-foreground">
            {formatBRL(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function YearlyComparisonChart({
  data,
  years,
}: YearlyComparisonChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"income" | "expense">("income");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = data.map((d) => ({
    month: d.month,
    current: view === "income" ? d.currentIncome : d.currentExpense,
    previous: view === "income" ? d.previousIncome : d.previousExpense,
  }));

  const primaryColor = view === "income" ? "#22c55e" : "#ef4444"; // emerald-500 : red-500
  const secondaryColor = view === "income" ? "#22c55e40" : "#ef444440"; // low opacity versions for previous year

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
          Comparativo {years.previous} vs {years.current}
        </p>
        <Tabs defaultValue="income" onValueChange={(v) => setView(v as any)}>
          <TabsList className="scale-90 origin-right">
            <TabsTrigger value="income">Receitas</TabsTrigger>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1" style={{ minHeight: 250 }}>
        {!isMounted ? (
          <Skeleton className="w-full h-full min-h-[250px]" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={<XAxisTick />}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={<YAxisTick />}
              axisLine={false}
              tickLine={false}
              width={65}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "currentColor", opacity: 0.05 }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-muted-foreground text-xs">
                  {value === "current"
                    ? `Este Ano (${years.current})`
                    : `Ano Anterior (${years.previous})`}
                </span>
              )}
            />
            <Bar
              dataKey="previous"
              name="previous"
              fill={secondaryColor}
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="current"
              name="current"
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
