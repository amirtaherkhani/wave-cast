"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

const chartBarColor = "var(--chart-1)";
const chartGridColor = "var(--border)";
const chartTickColor = "var(--muted-foreground)";

export function MiniBarChart({
  data,
  height = 170,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={chartGridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: chartTickColor, fontSize: 11 }}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: chartTickColor, fontSize: 11 }} />
          <Bar dataKey="value" fill={chartBarColor} radius={[4, 4, 0, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
