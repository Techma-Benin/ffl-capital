"use client";

import { clsx } from "clsx";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react";

type Status = "success" | "error";

const styles: Record<Status, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export function StatusStrip({
  status,
  title,
  message,
  className,
}: {
  status: Status | null;
  title?: string;
  message?: string;
  className?: string;
}) {
  if (!status) return null;

  const Icon = status === "success" ? CheckCircle : WarningCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "rounded-xl border px-4 py-3 text-sm",
        styles[status],
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={16} className="mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          {message && <p className={clsx(title && "mt-0.5 opacity-80")}>{message}</p>}
        </div>
      </div>
    </div>
  );
}
