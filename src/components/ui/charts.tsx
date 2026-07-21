"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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

const CHART_ENTRANCE_MS = 250;
const CHART_ENTRANCE_EASING = "ease-out";
const INTAKE_AREA_ENTRANCE_MS = 2000;
const GAUGE_TRACK_MS = 180;
const GAUGE_SEGMENT_MS = 250;
const GAUGE_SEGMENT_STAGGER_MS = 45;
const GAUGE_TRACK_DELAY_MS = 0;
const GAUGE_SEGMENT_BASE_DELAY_MS = 70;
const GAUGE_CENTER_DELAY_MS = 320;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

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
  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  if (data.length === 0) return null;

  const revealStyle: CSSProperties = reducedMotion
    ? {}
    : {
        clipPath: revealed ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
        transition: revealed
          ? `clip-path ${INTAKE_AREA_ENTRANCE_MS}ms ${CHART_ENTRANCE_EASING}`
          : "none",
      };

  return (
    <div className="overflow-hidden" style={{ height }}>
      <div className="h-full w-full" style={revealStyle}>
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
      </div>
    </div>
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
  reducedMotion,
  onEntranceComplete,
}: {
  width?: number;
  height?: number;
  dataWithFill: Array<{ name: string; value: number; fill: string }>;
  total: number;
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
  reducedMotion: boolean;
  onEntranceComplete?: () => void;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    value: number;
    fill: string;
  } | null>(null);
  const [revealed, setRevealed] = useState(reducedMotion);
  const [pathLengths, setPathLengths] = useState<{
    track: number;
    segments: Record<string, number>;
  }>({ track: 0, segments: {} });
  const trackRef = useRef<SVGPathElement>(null);
  const guideRef = useRef<SVGPathElement>(null);
  const entranceDoneRef = useRef(false);

  const ready = width > 0 && height > 0;
  const { cx, cy, innerRadius, outerRadius } = ready
    ? semiGaugeGeometry(width, height)
    : { cx: 0, cy: 0, innerRadius: 0, outerRadius: 0 };
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

  const dataKey = dataWithFill.map((d) => `${d.name}:${d.value}`).join("|");

  useLayoutEffect(() => {
    if (!ready) return;

    entranceDoneRef.current = false;

    const degs = segmentAngles(dataWithFill, total);
    const segments: Record<string, number> = {};
    let cumulativeDeg = 0;
    for (let i = 0; i < dataWithFill.length; i++) {
      const entry = dataWithFill[i];
      const segDeg = degs[i] ?? 0;
      const startAngle = GAUGE_START_ANGLE - cumulativeDeg;
      const endAngle = GAUGE_START_ANGLE - cumulativeDeg - segDeg;
      cumulativeDeg += segDeg;
      const d = describeArcPath(cx, cy, midRadius, startAngle, endAngle);
      if (!d) continue;
      const probe = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      probe.setAttribute("d", d);
      segments[entry.name] = probe.getTotalLength();
    }

    const trackLen = trackRef.current?.getTotalLength() ?? 0;
    setPathLengths({ track: trackLen, segments });

    if (reducedMotion) {
      setRevealed(true);
      if (!entranceDoneRef.current) {
        entranceDoneRef.current = true;
        onEntranceComplete?.();
      }
      return;
    }

    setRevealed(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, width, height, dataKey, total, reducedMotion, onEntranceComplete, cx, cy, midRadius, dataWithFill]);

  useEffect(() => {
    if (reducedMotion || !revealed || entranceDoneRef.current) return;
    const segmentCount = dataWithFill.length;
    const lastDelay =
      GAUGE_SEGMENT_BASE_DELAY_MS +
      Math.max(0, segmentCount - 1) * GAUGE_SEGMENT_STAGGER_MS;
    const totalMs = lastDelay + GAUGE_SEGMENT_MS + 40;
    const timer = window.setTimeout(() => {
      if (!entranceDoneRef.current) {
        entranceDoneRef.current = true;
        onEntranceComplete?.();
      }
    }, totalMs);
    return () => window.clearTimeout(timer);
  }, [revealed, reducedMotion, dataWithFill.length, onEntranceComplete]);

  if (!ready) return null;

  const drawOrder =
    activeIndex === null
      ? segmentLayers
      : [
          ...segmentLayers.filter(({ index }) => index !== activeIndex),
          ...segmentLayers.filter(({ index }) => index === activeIndex),
        ];
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

  const trackLength = pathLengths.track;

  const dashRevealStyle = (
    length: number,
    delayMs: number,
    durationMs: number,
  ): CSSProperties => {
    if (length <= 0) return {};
    if (reducedMotion) {
      return { strokeDasharray: length, strokeDashoffset: 0 };
    }
    return {
      strokeDasharray: length,
      strokeDashoffset: revealed ? 0 : length,
      transition: revealed
        ? `stroke-dashoffset ${durationMs}ms ${CHART_ENTRANCE_EASING} ${delayMs}ms`
        : "none",
    };
  };

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
          ref={guideRef}
          d={guidePath}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth={1.5}
          strokeDasharray="4 6"
          strokeLinecap="round"
          pointerEvents="none"
          opacity={reducedMotion || revealed ? 1 : 0}
          style={
            reducedMotion
              ? undefined
              : {
                  transition: revealed
                    ? `opacity ${GAUGE_TRACK_MS}ms ${CHART_ENTRANCE_EASING} ${GAUGE_TRACK_DELAY_MS}ms`
                    : "opacity 0ms",
                }
          }
        />
      ) : null}
      {trackPath ? (
        <path
          ref={trackRef}
          d={trackPath}
          fill="none"
          stroke={DONUT_TRACK}
          strokeWidth={ringThickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
          opacity={reducedMotion || revealed ? 1 : 0}
          style={{
            ...dashRevealStyle(trackLength, GAUGE_TRACK_DELAY_MS, GAUGE_TRACK_MS),
            transition: reducedMotion
              ? undefined
              : revealed
                ? `opacity ${GAUGE_TRACK_MS}ms ${CHART_ENTRANCE_EASING}, stroke-dashoffset ${GAUGE_TRACK_MS}ms ${CHART_ENTRANCE_EASING} ${GAUGE_TRACK_DELAY_MS}ms`
                : `opacity 0ms`,
          }}
        />
      ) : null}
      {total > 0 &&
        drawOrder.map(({ entry, index, startAngle, endAngle }) => {
          const opacity =
            activeIndex === null || activeIndex === index ? 1 : 0.35;
          const d = describeArcPath(cx, cy, midRadius, startAngle, endAngle);
          if (!d) return null;
          const segLength = pathLengths.segments[entry.name] ?? 0;
          const segmentDelay =
            GAUGE_SEGMENT_BASE_DELAY_MS + index * GAUGE_SEGMENT_STAGGER_MS;
          const dashStyle = dashRevealStyle(
            segLength,
            segmentDelay,
            GAUGE_SEGMENT_MS,
          );
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
                ...dashStyle,
                transition: reducedMotion
                  ? "opacity 150ms ease-out"
                  : [
                      "opacity 150ms ease-out",
                      dashStyle.transition,
                    ]
                      .filter(Boolean)
                      .join(", "),
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
  const reducedMotion = usePrefersReducedMotion();
  const [centerVisible, setCenterVisible] = useState(reducedMotion);
  const onEntranceComplete = useCallback(() => {
    setCenterVisible(true);
  }, []);

  const donutDataKey = data.map((d) => `${d.name}:${d.value}`).join("|");
  useEffect(() => {
    setCenterVisible(reducedMotion);
  }, [donutDataKey, reducedMotion]);

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
              reducedMotion={reducedMotion}
              onEntranceComplete={onEntranceComplete}
            />
          )}
        </ChartSizeMeasure>
      </div>
      {total > 0 && (
        <div
          className="pointer-events-none absolute left-1/2 top-[52%] flex flex-col items-center text-center"
          style={{
            transform: centerVisible
              ? "translate(-50%, -50%)"
              : "translate(-50%, calc(-50% + 4px))",
            ...(reducedMotion
              ? {}
              : {
                  opacity: centerVisible ? 1 : 0,
                  transition: `opacity ${GAUGE_TRACK_MS}ms ${CHART_ENTRANCE_EASING} ${GAUGE_CENTER_DELAY_MS}ms, transform ${GAUGE_TRACK_MS}ms ${CHART_ENTRANCE_EASING} ${GAUGE_CENTER_DELAY_MS}ms`,
                }),
          }}
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
