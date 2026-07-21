/** Per-route sidebar accents — aligned with StatCard / KPI tints where possible. */
export type SidebarNavAccent =
  | "brand"
  | "blue"
  | "violet"
  | "red"
  | "mint"
  | "purple"
  | "amber"
  | "cyan"
  | "rose"
  | "orange"
  | "slate";

export type SidebarNavAccentStyles = {
  activeBg: string;
  activeText: string;
  activeIcon: string;
  dot: string;
  spinner: "brand" | "slate" | "emerald" | "red";
};

export const sidebarNavAccentStyles: Record<
  SidebarNavAccent,
  SidebarNavAccentStyles
> = {
  brand: {
    activeBg: "bg-brand-50",
    activeText: "text-brand-800",
    activeIcon: "text-brand-700",
    dot: "bg-brand-700",
    spinner: "brand",
  },
  blue: {
    activeBg: "bg-blue-50",
    activeText: "text-blue-800",
    activeIcon: "text-blue-700",
    dot: "bg-blue-600",
    spinner: "slate",
  },
  violet: {
    activeBg: "bg-violet-50",
    activeText: "text-violet-800",
    activeIcon: "text-violet-700",
    dot: "bg-violet-600",
    spinner: "slate",
  },
  red: {
    activeBg: "bg-red-50",
    activeText: "text-red-800",
    activeIcon: "text-red-700",
    dot: "bg-red-600",
    spinner: "red",
  },
  mint: {
    activeBg: "bg-teal-50",
    activeText: "text-teal-800",
    activeIcon: "text-teal-700",
    dot: "bg-teal-600",
    spinner: "emerald",
  },
  purple: {
    activeBg: "bg-purple-50",
    activeText: "text-purple-800",
    activeIcon: "text-purple-700",
    dot: "bg-purple-600",
    spinner: "slate",
  },
  amber: {
    activeBg: "bg-amber-50",
    activeText: "text-amber-900",
    activeIcon: "text-amber-800",
    dot: "bg-amber-600",
    spinner: "slate",
  },
  cyan: {
    activeBg: "bg-cyan-50",
    activeText: "text-cyan-900",
    activeIcon: "text-cyan-700",
    dot: "bg-cyan-600",
    spinner: "slate",
  },
  rose: {
    activeBg: "bg-rose-50",
    activeText: "text-rose-800",
    activeIcon: "text-rose-700",
    dot: "bg-rose-600",
    spinner: "slate",
  },
  orange: {
    activeBg: "bg-orange-50",
    activeText: "text-orange-900",
    activeIcon: "text-orange-700",
    dot: "bg-orange-600",
    spinner: "slate",
  },
  slate: {
    activeBg: "bg-slate-100",
    activeText: "text-slate-800",
    activeIcon: "text-slate-700",
    dot: "bg-slate-600",
    spinner: "slate",
  },
};
