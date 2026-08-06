import { clsx } from "clsx";

export type BadgeVariant =
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "sky"
  | "indigo"
  | "cyan"
  | "teal"
  | "steel"
  | "slate"
  | "purple";

const variantClasses: Record<BadgeVariant, string> = {
  green:  "badge-green",
  yellow: "badge-yellow",
  red:    "badge-red",
  blue:   "badge-blue",
  sky:    "badge-sky",
  indigo: "badge-indigo",
  cyan:   "badge-cyan",
  teal:   "badge-teal",
  steel:  "badge-steel",
  slate:  "badge-slate",
  purple: "badge-purple",
};

export function Badge({
  variant = "slate",
  children,
  className,
  title,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={clsx(variantClasses[variant], className)} title={title}>
      {children}
    </span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={clsx(
        "inline-block h-2 w-2 rounded-full",
        active ? "bg-emerald-500" : "bg-slate-300"
      )}
    />
  );
}
