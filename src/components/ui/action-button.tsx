"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { Spinner } from "@/components/ui/spinner";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  /** Animate icon from start to end on hover (continue / forward actions). */
  slideIconOnHover?: boolean;
  children: ReactNode;
};

const slideIconLeading =
  "inline-flex w-4 shrink-0 justify-center overflow-hidden opacity-100 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none group-hover:w-0 group-hover:opacity-0";

const slideIconTrailing =
  "inline-flex w-0 shrink-0 justify-center overflow-hidden opacity-0 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none group-hover:w-4 group-hover:opacity-100";

const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
};

const spinnerVariants = {
  primary: "white" as const,
  secondary: "slate" as const,
  danger: "white" as const,
};

export function ActionButton({
  loading = false,
  loadingText = "Working…",
  success = false,
  successText = "Done",
  variant = "primary",
  icon,
  slideIconOnHover = false,
  children,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const busy = loading || success;
  const slideIcon = slideIconOnHover && Boolean(icon) && !busy;

  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={loading}
      className={clsx(
        variants[variant],
        busy && "opacity-90",
        slideIcon && "group",
        className,
      )}
    >
      {slideIcon ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className={slideIconLeading} aria-hidden>
            {icon}
          </span>
          <span>{children}</span>
          <span className={slideIconTrailing} aria-hidden>
            {icon}
          </span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          {loading && <Spinner size="sm" variant={spinnerVariants[variant]} />}
          {!loading && success && (
            <Check size={16} weight={ICON_WEIGHT_LINEAR} className="flex-shrink-0" />
          )}
          {!loading && !success && icon}
          <span>{loading ? loadingText : success ? successText : children}</span>
        </span>
      )}
    </button>
  );
}
