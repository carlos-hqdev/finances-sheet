"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

interface PeriodData {
  period: string;
  final: number;
  initial: number;
  result: number;
  percentage: number;
}

interface PeriodComparisonProps {
  data: PeriodData[];
  targetYear: number;
  baseYear: number;
  type: "INCOME" | "EXPENSE";
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Custom Tooltip for the Period Chart
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

export function PeriodComparisonAnalysis({
  data,
  targetYear,
  baseYear,
  type,
}: PeriodComparisonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
    setYears(Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i));
  }, []);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros da Análise */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ano Final
            </span>
            <Select
              value={String(targetYear)}
              onValueChange={(v) => updateParam("targetYear", v)}
              disabled={isPending || !isMounted}
            >
              <SelectTrigger className="w-25 bg-card h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isMounted &&
                  years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ano Inicial
            </span>
            <Select
              value={String(baseYear)}
              onValueChange={(v) => updateParam("baseYear", v)}
              disabled={isPending || !isMounted}
            >
              <SelectTrigger className="w-25 bg-card h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isMounted &&
                  years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className={isPending ? "pointer-events-none opacity-50" : undefined}
        >
          <Tabs value={type} onValueChange={(v) => updateParam("type", v)}>
            <TabsList className="bg-card h-8">
              <TabsTrigger value="INCOME" className="text-xs px-3">
                Receitas
              </TabsTrigger>
              <TabsTrigger value="EXPENSE" className="text-xs px-3">
                Despesas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tabela de Períodos */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold tracking-widest border-b border-border">
              <th className="p-3">Períodos</th>
              {data.map((d) => (
                <th key={d.period} className="p-3 text-center">
                  {d.period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="p-3 font-semibold text-muted-foreground border-r border-border bg-muted/10">
                {targetYear}
              </td>
              {data.map((d) => (
                <td key={d.period} className="p-3 text-center font-medium">
                  {formatBRL(d.final)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="p-3 font-semibold text-muted-foreground border-r border-border bg-muted/10">
                {baseYear}
              </td>
              {data.map((d) => (
                <td key={d.period} className="p-3 text-center font-medium">
                  {formatBRL(d.initial)}
                </td>
              ))}
            </tr>
            <tr className="bg-muted/5 border-t-2 border-border">
              <td className="p-3 font-bold text-foreground">RESULTADO</td>
              {data.map((d) => (
                <td
                  key={d.period}
                  className={`p-3 text-center font-bold ${d.result >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  <div className="flex flex-col items-center">
                    <span>{formatBRL(d.result)}</span>
                    <span className="text-[10px] opacity-80 flex items-center gap-1">
                      {d.percentage > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : d.percentage < 0 ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {d.percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Gráfico de Barras Agrupadas */}
      <div className="w-full mt-4" style={{ height: 300 }}>
        {!isMounted ? (
          <Skeleton className="w-full h-full" style={{ height: 300 }} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 32 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-border"
              />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tick={{ fill: "currentColor" }}
                className="text-muted-foreground font-bold"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tick={{ fill: "currentColor" }}
                width={60}
                tickFormatter={(v) => `R$ ${v / 1000}k`}
                className="text-muted-foreground"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "currentColor", opacity: 0.05 }}
              />
              <Legend verticalAlign="bottom" height={36} />
              <Bar
                dataKey="initial"
                name={`Ano Inicial (${baseYear})`}
                fill={type === "INCOME" ? "#22c55e40" : "#ef444440"}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Bar
                dataKey="final"
                name={`Ano Final (${targetYear})`}
                fill={type === "INCOME" ? "#22c55e" : "#ef4444"}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
