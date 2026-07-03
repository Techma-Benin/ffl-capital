"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";

type InlineActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  tone?: "emerald" | "red" | "slate";
  children: ReactNode;
};

const tones = {
  emerald:
    "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:hover:bg-emerald-50",
  red: "bg-red-50 text-red-700 hover:bg-red-100 disabled:hover:bg-red-50",
  slate: "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:hover:bg-slate-100",
};

export function InlineActionButton({
  loading = false,
  loadingText,
  icon,
  tone = "emerald",
  children,
  className,
  disabled,
  ...props
}: InlineActionButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        tones[tone],
        className,
      )}
    >
      {loading ? (
        <>
          <Spinner size="xs" variant={tone === "red" ? "red" : tone === "emerald" ? "emerald" : "slate"} />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
