"use client";

import { Check } from "@phosphor-icons/react";

const STEPS = [
  { n: 1 as const, label: "Your details", shortLabel: "Details" },
  { n: 2 as const, label: "Lead preferences", shortLabel: "Preferences" },
  {
    n: 3 as const,
    label: "Limits & filters",
    shortLabel: "Limits",
    optional: true,
  },
] as const;

type Step = 1 | 2 | 3;

export function OnboardingProgress({ step }: { step: Step }) {
  return (
    <div className="mb-8">
      <nav aria-label="Onboarding progress">
        <ol className="flex items-start">
          {STEPS.map(({ n, label, shortLabel, optional }, i) => {
            const done = step > n;
            const active = step === n;
            const isFirst = i === 0;
            const isLast = i === STEPS.length - 1;
            const prevDone = i > 0 && step > STEPS[i - 1]!.n;
            const segmentDone = !isLast && step > n;

            return (
              <li
                key={n}
                className="flex min-w-0 flex-1 flex-col items-center"
                aria-current={active ? "step" : undefined}
              >
                <div className="flex w-full items-center">
                  <div
                    className={`h-0.5 min-w-2 flex-1 rounded-full transition-colors ${
                      isFirst ? "bg-transparent" : prevDone ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                    aria-hidden
                  />
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      done
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                        : active
                          ? "bg-brand-700 text-white shadow-sm shadow-brand-700/20 ring-4 ring-brand-700/12"
                          : "border border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {done ? <Check size={16} weight="bold" aria-hidden /> : n}
                  </div>
                  <div
                    className={`h-0.5 min-w-2 flex-1 rounded-full transition-colors ${
                      isLast ? "bg-transparent" : segmentDone ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                    aria-hidden
                  />
                </div>
                <p
                  className={`mt-2 max-w-full px-1 text-center text-[11px] font-semibold leading-snug sm:text-xs ${
                    done ? "text-emerald-700" : active ? "text-brand-800" : "text-slate-400"
                  }`}
                >
                  <span className="line-clamp-2 sm:hidden">{shortLabel}</span>
                  <span className="hidden line-clamp-2 sm:inline">
                    {label}
                    {optional && (
                      <span className="font-normal text-slate-400"> (optional)</span>
                    )}
                  </span>
                </p>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="border-t border-slate-200/80 pt-4 text-center text-xs leading-relaxed text-slate-500">
        After you submit, an admin reviews your account before you receive leads.
      </p>
    </div>
  );
}
