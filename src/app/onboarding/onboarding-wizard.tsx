"use client";

import { useState } from "react";
import OnboardingForm from "./onboarding-form";
import { OnboardingProgress } from "./onboarding-progress";
import type { LeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";

type InitialProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  affiliation?: string;
  residenceState?: string;
};

type Props = {
  initialProfile: InitialProfile;
  criteriaOptions: LeadFilterCriteriaOptions;
  categories: Array<{ type: string; label: string }>;
};

export default function OnboardingWizard({
  initialProfile,
  criteriaOptions,
  categories,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs font-semibold text-accent-600">Account created</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            Complete your partner profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tell us about yourself and configure how you want to receive leads.
          </p>
        </div>
        <span className="flex-1" />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
          Step {step} of 3
        </span>
        <p className="w-full text-xs text-slate-400 sm:w-auto">
          An admin reviews your account before you receive leads.
        </p>
      </div>

      <OnboardingProgress step={step} />

      <OnboardingForm
        initialProfile={initialProfile}
        criteriaOptions={criteriaOptions}
        categories={categories}
        step={step}
        onStepChange={setStep}
      />
    </div>
  );
}
