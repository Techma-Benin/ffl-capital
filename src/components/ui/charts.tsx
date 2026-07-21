"use client";

import { Fragment, useState } from "react";
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
const TRACK_BG = "#E2E8F0";

function donutTrackRadii(index: number, trackCount: number) {
  const maxOuter = 88;
  const minInner = 48;
  const trackGap = 5;
  const trackWidth =
    trackCount > 0
      ? (maxOuter - minInner - (trackCount - 1) * trackGap) / trackCount
      : 0;
  const outer = maxOuter - index * (trackWidth + trackGap);
  const inner = outer - trackWidth;
  return { inner: `${inner}%`, outer: `${outer}%` };
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload.find(
    (p) => p.name && p.name !== "__remainder" && p.name !== "__empty",
  );
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

export function DonutChart({
  data,
  height = 160,
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

  const trackCount = dataWithFill.length;
  const semiProps = {
    cx: "50%" as const,
    cy: "92%" as const,
    startAngle: 180,
    endAngle: 0,
    stroke: "none" as const,
    isAnimationActive: false as const,
  };

  return (
    <div className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          {dataWithFill.map((entry, i) => {
            const { inner, outer } = donutTrackRadii(i, trackCount);
            const trackOpacity =
              activeIndex === null || activeIndex === i ? 1 : 0.35;
            const remainder = Math.max(0, total - entry.value);
            const foregroundData =
              total > 0
                ? [
                    { ...entry, fill: entry.fill },
                    {
                      name: "__remainder",
                      value: remainder,
                      fill: "transparent",
                    },
                  ]
                : [
                    {
                      name: "__empty",
                      value: 1,
                      fill: "transparent",
                    },
                  ];

            return (
              <Fragment key={entry.name}>
                <Pie
                  data={[{ value: 1 }]}
                  dataKey="value"
                  innerRadius={inner}
                  outerRadius={outer}
                  {...semiProps}
                >
                  <Cell fill={TRACK_BG} opacity={trackOpacity} />
                </Pie>
                <Pie
                  data={foregroundData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={inner}
                  outerRadius={outer}
                  paddingAngle={0}
                  cornerRadius={8}
                  {...semiProps}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {foregroundData.map((row, j) => (
                    <Cell
                      key={j}
                      fill={"fill" in row ? row.fill : entry.fill}
                      opacity={
                        row.name === "__remainder" || row.name === "__empty"
                          ? 0
                          : trackOpacity
                      }
                      style={{
                        cursor:
                          row.name === "__remainder" || row.name === "__empty"
                            ? "default"
                            : "pointer",
                      }}
                    />
                  ))}
                </Pie>
              </Fragment>
            );
          })}
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
          style={{ bottom: height * 0.06 }}
        >
          <span className="text-2xl font-bold tabular-nums text-slate-900">
            {centerValue}
          </span>
          <span className="max-w-[8rem] truncate text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}
