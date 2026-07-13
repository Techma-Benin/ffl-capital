"use client";

import {
  Area,
  AreaChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

const BRAND = "#0B3D91";
const ACCENT = "#00A651";

export function SparklineChart({
  data,
  dataKey = "value",
  color = BRAND,
  height = 48,
}: {
  data: Array<Record<string, number>>;
  dataKey?: string;
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function IntakeAreaChart({
  data,
  height = 220,
}: {
  data: Array<{ label: string; leads: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="intakeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.25} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="leads"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#intakeFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = [BRAND, ACCENT, "#72A5E1", "#F59E0B", "#8B5CF6"];

export function DonutChart({
  data,
  height = 200,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Total
          </span>
        </div>
      )}
    </div>
  );
}
