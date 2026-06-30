import { clsx } from "clsx";

type BadgeVariant = "green" | "yellow" | "red" | "blue" | "slate" | "purple";

const variantClasses: Record<BadgeVariant, string> = {
  green:  "badge-green",
  yellow: "badge-yellow",
  red:    "badge-red",
  blue:   "badge-blue",
  slate:  "badge-slate",
  purple: "badge-purple",
};

export function Badge({
  variant = "slate",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx(variantClasses[variant], className)}>
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
