"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
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

function IntakeAreaTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ value: number }>;
}) {
  if (!active || !payload?.length || label == null) return null;
  const value = payload[0]?.value;
  if (value == null) return null;
  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        fontSize: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        backgroundColor: "#fff",
        padding: "8px 12px",
        fontWeight: 600,
        color: "#1e293b",
      }}
    >
      {label} · {value}
    </div>
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
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f0"
          strokeOpacity={0.4}
        />
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
        <Tooltip content={<IntakeAreaTooltip />} />
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
const DONUT_TRACK = "#E2E8F0";
/** Paint order: first segment along the arc is bottom; later segments stack on top at junctions. */
/** Speedometer-style arc: bottom-left → over top → bottom-right (~270°). */
const GAUGE_START_ANGLE = 225;
const GAUGE_END_ANGLE = -45;
const GAUGE_ARC_SPAN = GAUGE_START_ANGLE - GAUGE_END_ANGLE;

const DONUT_MARGIN = { top: 20, right: 20, left: 20, bottom: 28 };

function semiGaugeGeometry(width: number, height: number) {
  const innerW = width - DONUT_MARGIN.left - DONUT_MARGIN.right;
  const innerH = height - DONUT_MARGIN.top - DONUT_MARGIN.bottom;
  const cx = DONUT_MARGIN.left + innerW / 2;
  const cy = DONUT_MARGIN.top + innerH * 0.59;
  const outerRadius =
    Math.min(innerW / 2, innerH * 0.72) * 0.9;
  const innerRadius = outerRadius * 0.78;
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

function segmentAngles(
  dataWithFill: Array<{ value: number }>,
  total: number,
  arcSpan = GAUGE_ARC_SPAN,
): number[] {
  if (total <= 0) return [];
  return dataWithFill.map((d) => (d.value / total) * arcSpan);
}

/** Polar coords: 0° = 3 o'clock, angles increase counter-clockwise (math convention). */
function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function describeArcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const span = startAngle - endAngle;
  if (span <= 0) return "";
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = span > 180 ? 1 : 0;
  /** sweep=1 keeps the arc on the upper side (speedometer), not the lower bulge. */
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
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
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    value: number;
    fill: string;
  } | null>(null);

  if (!width || !height) return null;

  const { cx, cy, innerRadius, outerRadius } = semiGaugeGeometry(
    width,
    height,
  );
  const ringThickness = outerRadius - innerRadius;
  const cornerRadius = ringThickness / 2;
  const midRadius = innerRadius + cornerRadius;
  const segmentDegs = segmentAngles(dataWithFill, total);

  let cumulative = 0;
  const segmentLayers = dataWithFill.map((entry, index) => {
    const segDeg = segmentDegs[index] ?? 0;
    const startAngle = GAUGE_START_ANGLE - cumulative;
    const endAngle = GAUGE_START_ANGLE - cumulative - segDeg;
    cumulative += segDeg;
    return { entry, index, startAngle, endAngle };
  });

  const drawOrder = segmentLayers;
  const trackPath = describeArcPath(
    cx,
    cy,
    midRadius,
    GAUGE_START_ANGLE,
    GAUGE_END_ANGLE,
  );
  const guideRadius = midRadius - ringThickness / 2 - 5;
  const guidePath = describeArcPath(
    cx,
    cy,
    guideRadius,
    GAUGE_START_ANGLE,
    GAUGE_END_ANGLE,
  );

  return (
    <>
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="max-h-full max-w-full overflow-hidden"
      role="img"
      aria-hidden={total <= 0}
    >
      {guidePath ? (
        <path
          d={guidePath}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth={1.5}
          strokeDasharray="4 6"
          strokeLinecap="round"
          pointerEvents="none"
        />
      ) : null}
      {trackPath ? (
        <path
          d={trackPath}
          fill="none"
          stroke={DONUT_TRACK}
          strokeWidth={ringThickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      ) : null}
      {total > 0 &&
        drawOrder.map(({ entry, index, startAngle, endAngle }) => {
          const opacity =
            activeIndex === null || activeIndex === index ? 1 : 0.35;
          const d = describeArcPath(cx, cy, midRadius, startAngle, endAngle);
          if (!d) return null;
          return (
            <path
              key={entry.name}
              d={d}
              fill="none"
              stroke={entry.fill}
              strokeWidth={ringThickness}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
              style={{
                cursor: "pointer",
                transition: "opacity 150ms ease-out",
              }}
              onMouseEnter={(e) => {
                setActiveIndex(index);
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  name: entry.name,
                  value: entry.value,
                  fill: entry.fill,
                });
              }}
              onMouseMove={(e) => {
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  name: entry.name,
                  value: entry.value,
                  fill: entry.fill,
                });
              }}
              onMouseLeave={() => {
                setActiveIndex(null);
                setTooltip(null);
              }}
            />
          );
        })}
    </svg>
      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <DonutTooltip
            active
            payload={[
              {
                name: tooltip.name,
                value: tooltip.value,
                payload: { fill: tooltip.fill },
              },
            ]}
          />
        </div>
      ) : null}
    </>
  );
}

function ChartSizeMeasure({
  height,
  children,
}: {
  height: number;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width } = el.getBoundingClientRect();
      if (width > 0) setSize({ width, height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  return (
    <div ref={ref} className="h-full w-full min-h-0">
      {size.width > 0 ? children(size) : null}
    </div>
  );
}

export function DonutChart({
  data,
  height = 300,
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

  return (
    <div className="relative flex w-full min-h-0 flex-col items-center" style={{ height }}>
      <div className="flex w-full flex-1 items-center justify-center">
        <ChartSizeMeasure height={height}>
          {(size) => (
            <DonutChartGauge
              width={size.width}
              height={size.height}
              dataWithFill={dataWithFill}
              total={total}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            />
          )}
        </ChartSizeMeasure>
      </div>
      {total > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-[52%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
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
