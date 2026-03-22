"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PatrimonySlice = {
  name: string;
  value: number;
  color: string;
};

interface PatrimonyChartProps {
  data: PatrimonySlice[];
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="font-medium text-foreground">{d.name}</span>
      </div>
      <p className="text-muted-foreground mt-1">
        {formatBRL(d.value)}{" "}
        <span className="font-semibold text-foreground">({d.payload.pct}%)</span>
      </p>
    </div>
  );
}

export function PatrimonyChart({ data }: PatrimonyChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const dataWithPct = data.map((d) => ({
    ...d,
    pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0",
  }));

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Donut */}
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithPct}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
            >
              {dataWithPct.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda lateral */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Total: {formatBRL(total)}
        </p>
        {dataWithPct.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-muted-foreground truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-foreground font-medium">{formatBRL(d.value)}</span>
              <span className="text-muted-foreground text-xs w-10 text-right">{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
