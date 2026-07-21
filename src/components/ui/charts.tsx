"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="intakeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND} stopOpacity={0.8} />
            <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          labelStyle={{ fontWeight: 600, color: "#1e293b" }}
          formatter={(value: number) => [value, "Leads"]}
        />
        <Area
          type="monotone"
          dataKey="leads"
          stroke={BRAND}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#intakeFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = [BRAND, ACCENT, "#72A5E1", "#F59E0B", "#8B5CF6"];

const DONUT_MARGIN = { top: 8, right: 12, left: 12, bottom: 12 };

function semiGaugeGeometry(width: number, height: number) {
  const innerW = width - DONUT_MARGIN.left - DONUT_MARGIN.right;
  const innerH = height - DONUT_MARGIN.top - DONUT_MARGIN.bottom;
  const cx = DONUT_MARGIN.left + innerW / 2;
  const cy = DONUT_MARGIN.top + innerH - 4;
  const outerRadius = Math.min(innerW / 2 - 6, innerH - 12) * 0.94;
  const innerRadius = outerRadius * 0.58;
  return { cx, cy, innerRadius, outerRadius };
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload.find((p) => p.name && p.name !== "__empty");
  if (!item) return null;
  const color = item.payload.fill;
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
      style={{ fontSize: 12 }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-medium text-slate-700">{item.name}</span>
      <span className="font-semibold text-slate-900">{item.value}</span>
    </div>
  );
}

function DonutChartGauge({
  width = 0,
  height = 0,
  dataWithFill,
  total,
  activeIndex,
  setActiveIndex,
}: {
  width?: number;
  height?: number;
  dataWithFill: Array<{ name: string; value: number; fill: string }>;
  total: number;
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
}) {
  if (!width || !height) return null;

  const { cx, cy, innerRadius, outerRadius } = semiGaugeGeometry(
    width,
    height,
  );
  const pieData =
    total > 0
      ? dataWithFill
      : [{ name: "__empty", value: 1, fill: "transparent" }];

  return (
    <PieChart width={width} height={height} margin={DONUT_MARGIN}>
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={180}
        endAngle={0}
        paddingAngle={total > 0 ? 3 : 0}
        cornerRadius={8}
        stroke="none"
        isAnimationActive={false}
        onMouseEnter={(_, index) => {
          if (total > 0) setActiveIndex(index);
        }}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {pieData.map((entry, i) => {
          const opacity =
            entry.name === "__empty"
              ? 0
              : activeIndex === null || activeIndex === i
                ? 1
                : 0.35;
          return (
            <Cell
              key={entry.name}
              fill={entry.fill}
              opacity={opacity}
              style={{
                cursor: entry.name === "__empty" ? "default" : "pointer",
              }}
            />
          );
        })}
      </Pie>
      <Tooltip content={<DonutTooltip />} />
    </PieChart>
  );
}

export function DonutChart({
  data,
  height = 280,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const activeItem = activeIndex !== null ? data[activeIndex] : null;
  const centerValue = activeItem?.value ?? total;
  const centerLabel = activeItem?.name ?? "Total";

  const dataWithFill = data.map((d, i) => ({
    ...d,
    fill: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const centerOffset =
    height > 0
      ? DONUT_MARGIN.bottom +
        Math.min(
          (height - DONUT_MARGIN.top - DONUT_MARGIN.bottom) * 0.22,
          height * 0.12,
        )
      : 24;

  return (
    <div className="relative w-full min-h-0" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <DonutChartGauge
          dataWithFill={dataWithFill}
          total={total}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
        />
      </ResponsiveContainer>
      {total > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
          style={{ bottom: centerOffset }}
        >
          <span className="text-3xl font-bold tabular-nums text-slate-900">
            {centerValue}
          </span>
          <span className="max-w-[10rem] truncate text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}
