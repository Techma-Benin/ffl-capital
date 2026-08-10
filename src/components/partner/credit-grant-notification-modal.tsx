"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Confetti,
  ArrowRight,
  ICON_WEIGHT,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { ActionButton } from "@/components/ui/action-button";
import { formatUsd } from "@/lib/format-money";
import type { GrantNotification } from "@/lib/wallet/grant-notification";

type Props = {
  open: boolean;
  notification: GrantNotification | null;
  onDismiss: () => void;
  acknowledging?: boolean;
};

const SPARKLE_POSITIONS = [
  { top: "8%", left: "18%", delay: "0s", color: "bg-emerald-400" },
  { top: "14%", right: "22%", delay: "0.35s", color: "bg-brand-400" },
  { top: "28%", left: "8%", delay: "0.7s", color: "bg-emerald-300" },
  { top: "22%", right: "10%", delay: "0.2s", color: "bg-brand-300" },
  { top: "42%", left: "14%", delay: "1.1s", color: "bg-emerald-500/80" },
  { top: "38%", right: "16%", delay: "0.55s", color: "bg-brand-500/70" },
] as const;

export function CreditGrantNotificationModal({
  open,
  notification,
  onDismiss,
  acknowledging,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const ctaId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      document.getElementById(ctaId)?.focus();
    }, 420);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, ctaId]);

  if (!open || !notification || typeof document === "undefined") return null;

  const amountLabel = formatUsd(notification.amount);
  const balanceLabel = formatUsd(notification.balanceAfter);

  function handleViewWallet() {
    onDismiss();
    router.push("/partner/wallet");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 motion-safe:animate-onboarding-backdrop-in motion-reduce:animate-none bg-slate-900/45 backdrop-blur-[2px]"
      aria-hidden={false}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-brand-900/10 motion-safe:animate-onboarding-modal-in motion-reduce:animate-none opacity-0 motion-reduce:opacity-100"
      >
        <div className="relative px-6 pt-10 pb-2 text-center" aria-hidden>
          {SPARKLE_POSITIONS.map((s, i) => (
            <span
              key={i}
              className={`pointer-events-none absolute h-2 w-2 rounded-full ${s.color} motion-safe:animate-onboarding-sparkle motion-reduce:hidden opacity-0`}
              style={{
                top: s.top,
                left: "left" in s ? s.left : undefined,
                right: "right" in s ? s.right : undefined,
                animationDelay: s.delay,
              }}
            />
          ))}

          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-50 via-brand-50 to-emerald-100/80 ring-1 ring-emerald-200/60" />
            <span className="absolute -inset-1 rounded-full border border-dashed border-brand-200/50 motion-safe:animate-[spin_24s_linear_infinite] motion-reduce:animate-none" />
            <span className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white shadow-md shadow-brand-700/10 ring-4 ring-white motion-safe:animate-onboarding-icon-pop motion-reduce:animate-none opacity-0 motion-reduce:opacity-100">
              <Wallet
                size={40}
                weight={ICON_WEIGHT}
                className="text-brand-700"
                aria-hidden
              />
            </span>
            <Confetti
              size={22}
              weight={ICON_WEIGHT}
              className="absolute -right-1 top-2 text-emerald-500 motion-safe:animate-onboarding-sparkle motion-reduce:animate-none"
              style={{ animationDelay: "0.4s" }}
              aria-hidden
            />
            <Confetti
              size={18}
              weight={ICON_WEIGHT}
              className="absolute -left-2 bottom-3 text-brand-500 motion-safe:animate-onboarding-sparkle motion-reduce:animate-none"
              style={{ animationDelay: "0.9s" }}
              aria-hidden
            />
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 text-center">
          <h2
            id={titleId}
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            Credit added to your account
          </h2>
          <p
            id={descId}
            className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500"
          >
            <span className="font-semibold text-emerald-700">{amountLabel}</span>{" "}
            has been added to your wallet
            {notification.adminName ? (
              <>
                {" "}
                by <span className="font-medium text-slate-700">{notification.adminName}</span>
              </>
            ) : null}
            . Your new balance is{" "}
            <span className="font-semibold text-slate-800">{balanceLabel}</span>.
            {notification.note ? (
              <>
                <br />
                <span className="mt-2 block text-slate-500">
                  &ldquo;{notification.note}&rdquo;
                </span>
              </>
            ) : null}
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <ActionButton
              id={ctaId}
              type="button"
              className="w-full justify-center"
              onClick={handleViewWallet}
              disabled={acknowledging}
              icon={
                acknowledging ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ArrowRight size={15} weight={ICON_WEIGHT_LINEAR} />
                )
              }
              slideIconOnHover={!acknowledging}
            >
              {acknowledging ? "Saving…" : "View wallet"}
            </ActionButton>
            <button
              type="button"
              onClick={onDismiss}
              disabled={acknowledging}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
