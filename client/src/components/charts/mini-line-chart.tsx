"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const chartColor = "var(--chart-3)";
const chartGridColor = "var(--border)";
const chartTickColor = "var(--muted-foreground)";

export function MiniLineChart({
  data,
  height = 170,
  area = false,
}: {
  data: { label: string; value?: number; listeners?: number }[];
  height?: number;
  area?: boolean;
}) {
  const key = "value" in data[0] ? "value" : "listeners";

  if (area) {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="wavecastArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.28} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartGridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartTickColor, fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartTickColor, fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey={key}
              stroke={chartColor}
              strokeWidth={3}
              fill="url(#wavecastArea)"
              dot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={chartGridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: chartTickColor, fontSize: 11 }}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: chartTickColor, fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey={key}
            stroke={chartColor}
            strokeWidth={3}
            dot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
