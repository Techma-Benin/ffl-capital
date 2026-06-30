"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

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
      className={clsx(variants[variant], busy && "opacity-80", className)}
    >
      <span className="flex items-center justify-center gap-2">
        {!loading && !success && icon}
        <span>
          {loading ? loadingText : success ? successText : children}
        </span>
      </span>
    </button>
  );
}
