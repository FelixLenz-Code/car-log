"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ConsumptionDatum = {
  label: string;
  consumption: number;
};

export function ConsumptionChart({
  data,
  unit,
}: {
  data: ConsumptionDatum[];
  unit: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Noch nicht genug Voll-Tankungen für eine Verbrauchskurve.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="cons" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(38 92% 55%)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="hsl(38 92% 55%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 13% 17%)" />
        <XAxis
          dataKey="label"
          stroke="hsl(220 9% 60%)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(220 9% 60%)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(222 15% 9%)",
            border: "1px solid hsl(222 13% 17%)",
            borderRadius: 12,
            color: "hsl(40 12% 92%)",
          }}
          formatter={(v: number) => [`${v.toFixed(2)} ${unit}`, "Verbrauch"]}
        />
        <Area
          type="monotone"
          dataKey="consumption"
          stroke="hsl(38 92% 55%)"
          strokeWidth={2}
          fill="url(#cons)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
