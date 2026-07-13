"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  children: ReactNode;
};

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
  children,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const busy = loading || success;

  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={loading}
      className={clsx(variants[variant], busy && "opacity-90", className)}
    >
      <span className="flex items-center justify-center gap-2">
        {loading && <Spinner size="sm" variant={spinnerVariants[variant]} />}
        {!loading && success && <Check size={16} className="flex-shrink-0" />}
        {!loading && !success && icon}
        <span>{loading ? loadingText : success ? successText : children}</span>
      </span>
    </button>
  );
}
