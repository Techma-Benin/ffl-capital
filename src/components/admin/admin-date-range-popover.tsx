"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { clsx } from "clsx";
import { ArrowLeft, ArrowRight, X } from "@/lib/icons/client";
import { ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import {
  adminDateToYmd,
  adminParseYmd,
  formatAdminCustomRangeLabel,
  formatAdminDateRangeFieldLabel,
} from "@/lib/admin/admin-date-period";
import styles from "./admin-date-range-popover.module.css";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function ymdTime(d: Date | null): number | null {
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return ymdTime(a) === ymdTime(b);
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

type PickerKind = "month" | "year" | null;
type EditingField = "start" | "end" | null;

export function AdminDateRangePopover({
  from,
  to,
  onApply,
  onCancel,
  open: openControlled,
  onOpenChange,
  hideTrigger = false,
}: {
  from?: string;
  to?: string;
  onApply: (from: string, to: string) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, show the calendar inline without a separate trigger button. */
  hideTrigger?: boolean;
}) {
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [openInternal, setOpenInternal] = useState(false);
  const open = openControlled ?? openInternal;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openControlled === undefined) setOpenInternal(next);
      onOpenChange?.(next);
    },
    [openControlled, onOpenChange],
  );

  const appliedFrom = from ? adminParseYmd(from) : null;
  const appliedTo = to ? adminParseYmd(to) : null;

  const [view, setView] = useState(() => startOfMonth(appliedFrom ?? new Date()));
  const [start, setStart] = useState<Date | null>(appliedFrom);
  const [end, setEnd] = useState<Date | null>(appliedTo);
  const [hover, setHover] = useState<Date | null>(null);
  const [editing, setEditing] = useState<EditingField>(null);
  const [picker, setPicker] = useState<PickerKind>(null);

  function resetWorkingFromApplied() {
    setStart(appliedFrom);
    setEnd(appliedTo);
    setEditing(null);
    setHover(null);
    setPicker(null);
    const anchor = appliedFrom ?? new Date();
    setView(startOfMonth(anchor));
  }

  function openPopover() {
    resetWorkingFromApplied();
    setOpen(true);
  }

  function closePopover() {
    setOpen(false);
    setPicker(null);
  }

  function handleDismiss() {
    resetWorkingFromApplied();
    if (hideTrigger) {
      onCancel?.();
    } else {
      closePopover();
    }
  }

  useEffect(() => {
    if (!open) return;
    const nextStart = from ? adminParseYmd(from) : null;
    const nextEnd = to ? adminParseYmd(to) : null;
    setStart(nextStart);
    setEnd(nextEnd);
    setEditing(null);
    setHover(null);
    setPicker(null);
    const anchor = nextStart ?? new Date();
    setView(startOfMonth(anchor));
  }, [open, from, to]);

  useEffect(() => {
    if (!open || hideTrigger) return;
    function onDocClick(e: globalThis.MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(e.target as Node)) return;
      setOpen(false);
      setPicker(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setPicker(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen, hideTrigger]);

  function closePicker() {
    setPicker(null);
  }

  function pick(t: number) {
    const d = new Date(t);
    if (editing === "start") {
      setStart(d);
      if (end && ymdTime(end)! < ymdTime(d)!) setEnd(null);
      setEditing(end && ymdTime(end)! >= ymdTime(d)! ? null : "end");
    } else if (editing === "end") {
      if (start && ymdTime(d)! < ymdTime(start)!) {
        setEnd(start);
        setStart(d);
      } else {
        setEnd(d);
      }
      setEditing(null);
    } else if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else if (ymdTime(d)! < ymdTime(start)!) {
      setEnd(start);
      setStart(d);
    } else {
      setEnd(d);
    }
    setHover(null);
  }

  function onDayClick(t: number, month: number) {
    const d = new Date(t);
    if (d.getMonth() !== month) {
      setView(startOfMonth(d));
    }
    pick(t);
  }

  const startYmd = start ? adminDateToYmd(start) : undefined;
  const endYmd = end ? adminDateToYmd(end) : undefined;

  const startActive = editing ? editing === "start" : !start || !!(start && end);
  const endActive = editing ? editing === "end" : !!(start && !end);

  let previewStart: Date | null = null;
  let previewEnd: Date | null = null;
  if (start && !end && hover) {
    if (ymdTime(hover)! >= ymdTime(start)!) {
      previewStart = start;
      previewEnd = hover;
    } else {
      previewStart = hover;
      previewEnd = start;
    }
  }

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const today = ymdTime(new Date());
  const cells: ReactNode[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const t = ymdTime(d)!;
    const other = d.getMonth() !== view.getMonth();
    const col = i % 7;
    const isStart = sameDay(d, start);
    const isEnd = sameDay(d, end);
    const inRange =
      !!start &&
      !!end &&
      t > ymdTime(start)! &&
      t < ymdTime(end)!;
    const preview =
      !!previewStart &&
      !!previewEnd &&
      t >= ymdTime(previewStart)! &&
      t <= ymdTime(previewEnd)! &&
      !isStart;

    cells.push(
      <div
        key={t}
        className={clsx(
          styles.cell,
          other && styles.other,
          t === today && styles.today,
          col === 0 && styles.weekStart,
          col === 6 && styles.weekEnd,
          isStart && styles.rangeStart,
          isEnd && styles.rangeEnd,
          inRange && styles.inRange,
          preview && !isStart && !isEnd && !inRange && styles.preview,
        )}
      >
        <button
          type="button"
          className={styles.day}
          data-t={t}
          onClick={() => onDayClick(t, view.getMonth())}
          onMouseEnter={() => {
            if (start && !end) setHover(d);
          }}
        >
          {d.getDate()}
        </button>
      </div>,
    );
  }

  const triggerLabel = formatAdminCustomRangeLabel(from, to);

  function handleApply() {
    if (!start) return;
    const endDate = end ?? start;
    onApply(adminDateToYmd(start), adminDateToYmd(endDate));
    if (!hideTrigger) closePopover();
  }

  const panelVisible = hideTrigger || open;

  return (
    <div
      className={clsx("relative", hideTrigger && "w-full max-w-[390px]")}
      ref={rootRef}
    >
      {!hideTrigger && (
      <button
        type="button"
        className={clsx(
          "inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-900 transition-shadow",
          open
            ? "border-brand-600 shadow-[0_0_0_3px_rgb(29_78_216/0.12)]"
            : "border-slate-200 shadow-none hover:border-slate-300",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => (open ? closePopover() : openPopover())}
      >
        <span>{triggerLabel}</span>
        <CalendarIcon className="h-[18px] w-[18px] shrink-0 stroke-slate-500" />
      </button>
      )}

      <div
        id={dialogId}
        ref={popoverRef}
        role="dialog"
        aria-label="Filter by date"
        className={clsx(
          styles.popover,
          hideTrigger ? styles.popoverInline : panelVisible && styles.popoverOpen,
        )}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        onMouseLeave={() => setHover(null)}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <CalendarIcon className="h-5 w-5 shrink-0 stroke-slate-900" />
          <h2 className="flex-1 text-base font-semibold text-slate-900">
            Filter by date
          </h2>
          <button
            type="button"
            className="flex rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
            onClick={handleDismiss}
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-2.5">
          <button
            type="button"
            className={clsx(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left text-sm transition-[border-color,box-shadow]",
              startActive
                ? "border-brand-600 shadow-[0_0_0_3px_rgb(29_78_216/0.1)]"
                : "border-slate-200 hover:border-slate-300",
            )}
            onClick={() => {
              setEditing("start");
              if (start) setView(startOfMonth(start));
            }}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 stroke-slate-500" />
            <span
              className={clsx(
                "truncate",
                startYmd ? "text-slate-900" : "text-slate-400",
              )}
            >
              {startYmd ? formatAdminDateRangeFieldLabel(startYmd) : "Start date"}
            </span>
          </button>
          <span className="shrink-0 text-slate-400">→</span>
          <button
            type="button"
            className={clsx(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left text-sm transition-[border-color,box-shadow]",
              endActive
                ? "border-brand-600 shadow-[0_0_0_3px_rgb(29_78_216/0.1)]"
                : "border-slate-200 hover:border-slate-300",
            )}
            onClick={() => {
              setEditing("end");
              const anchor = end ?? start;
              if (anchor) setView(startOfMonth(anchor));
            }}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 stroke-slate-500" />
            <span
              className={clsx(
                "truncate",
                endYmd ? "text-slate-900" : "text-slate-400",
              )}
            >
              {endYmd ? formatAdminDateRangeFieldLabel(endYmd) : "End date"}
            </span>
          </button>
        </div>

        <div className="mb-1.5 flex items-center justify-between">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-900 hover:bg-slate-50"
            aria-label="Previous month"
            onClick={() => {
              closePicker();
              setView(
                new Date(view.getFullYear(), view.getMonth() - 1, 1),
              );
            }}
          >
            <ArrowLeft size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
          <div className="flex gap-0.5">
            <button
              type="button"
              className={clsx(
                "rounded-lg px-2 py-1.5 text-[15px] font-semibold text-slate-900 hover:bg-slate-100",
                picker === "month" && "bg-blue-50 text-brand-700",
              )}
              onClick={() =>
                setPicker((p) => (p === "month" ? null : "month"))
              }
            >
              {MONTHS[view.getMonth()]}
            </button>
            <button
              type="button"
              className={clsx(
                "rounded-lg px-2 py-1.5 text-[15px] font-semibold text-slate-900 hover:bg-slate-100",
                picker === "year" && "bg-blue-50 text-brand-700",
              )}
              onClick={() => setPicker((p) => (p === "year" ? null : "year"))}
            >
              {view.getFullYear()}
            </button>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-900 hover:bg-slate-50"
            aria-label="Next month"
            onClick={() => {
              closePicker();
              setView(
                new Date(view.getFullYear(), view.getMonth() + 1, 1),
              );
            }}
          >
            <ArrowRight size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className={styles.calBody}>
          <div className={styles.weekdays}>
            {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
              <div key={`${w}-${i}`}>{w}</div>
            ))}
          </div>
          <div className={styles.days}>{cells}</div>

          <div
            className={clsx(
              styles.pickerPanel,
              picker === "year" && styles.pickerPanelYears,
              !picker && styles.pickerPanelHidden,
            )}
          >
            {picker === "month" &&
              MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  className={clsx(
                    "rounded-[10px] border px-0 py-3 text-sm font-medium transition-colors",
                    i === view.getMonth()
                      ? "border-brand-700 bg-brand-700 font-semibold text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                  )}
                  onClick={() => {
                    setView(new Date(view.getFullYear(), i, 1));
                    closePicker();
                  }}
                >
                  {m}
                </button>
              ))}
            {picker === "year" &&
              Array.from({ length: 12 }, (_, idx) => {
                const y = view.getFullYear() - 6 + idx;
                const sel = y === view.getFullYear();
                return (
                  <button
                    key={y}
                    type="button"
                    className={clsx(
                      "rounded-[10px] border px-0 py-3 text-sm font-medium transition-colors",
                      sel
                        ? "border-brand-700 bg-brand-700 font-semibold text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                    )}
                    onClick={() => {
                      setView(new Date(y, view.getMonth(), 1));
                      closePicker();
                    }}
                  >
                    {y}
                  </button>
                );
              })}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2.5">
          <button
            type="button"
            className="rounded-[10px] border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            onClick={handleDismiss}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-transparent bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!start}
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
