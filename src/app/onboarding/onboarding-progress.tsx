"use client";

import { Check } from "@phosphor-icons/react";

const STEPS = [
  { n: 1 as const, label: "Your details", shortLabel: "Details" },
  { n: 2 as const, label: "Lead preferences", shortLabel: "Preferences" },
] as const;

type Step = 1 | 2;

export function OnboardingProgress({ step }: { step: Step }) {
  return (
    <div className="mb-8">
      <nav aria-label="Onboarding progress">
        <ol className="flex items-stretch">
          {STEPS.map(({ n, label, shortLabel }, i) => {
            const done = step > n;
            const active = step === n;
            const isLast = i === STEPS.length - 1;

            return (
              <li
                key={n}
                className={`flex items-center ${isLast ? "shrink-0" : "min-w-0 flex-1"}`}
                aria-current={active ? "step" : undefined}
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
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
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-semibold leading-tight ${
                        done ? "text-emerald-700" : active ? "text-brand-800" : "text-slate-400"
                      }`}
                    >
                      <span className="sm:hidden">{shortLabel}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </p>
                    {active && (
                      <p className="mt-0.5 text-[11px] font-medium text-brand-600/80">
                        Step {n} of {STEPS.length}
                      </p>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <div
                    className="mx-3 hidden min-w-[2rem] flex-1 sm:mx-5 sm:block"
                    aria-hidden
                  >
                    <div
                      className={`h-0.5 w-full rounded-full transition-colors ${
                        done ? "bg-emerald-400" : "bg-slate-200"
                      }`}
                    />
                  </div>
                )}
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
