import { clsx } from "clsx";

const sizes = {
  xs: "h-3 w-3 border",
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-6 w-6 border-2",
};

const variants = {
  brand: "border-brand-200 border-t-brand-600",
  white: "border-white/30 border-t-white",
  slate: "border-slate-200 border-t-slate-600",
  emerald: "border-emerald-200 border-t-emerald-600",
  red: "border-red-200 border-t-red-600",
};

type SpinnerProps = {
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  className?: string;
  label?: string;
};

export function Spinner({
  size = "sm",
  variant = "brand",
  className,
  label = "Loading",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx(
        "inline-block flex-shrink-0 animate-spin rounded-full motion-reduce:animate-none motion-reduce:border-t-transparent",
        sizes[size],
        variants[variant],
        className,
      )}
    />
  );
}
