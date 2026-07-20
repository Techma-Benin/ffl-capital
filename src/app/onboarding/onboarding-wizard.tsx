"use client";

import { useState, useCallback } from "react";
import OnboardingForm, { type OnboardingSkipControl } from "./onboarding-form";
import { OnboardingProgress } from "./onboarding-progress";

type InitialProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  affiliation?: string;
  residenceState?: string;
};

type Props = { initialProfile: InitialProfile };

export default function OnboardingWizard({ initialProfile }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [skipControl, setSkipControl] = useState<OnboardingSkipControl | null>(null);
  const handleSkipControlChange = useCallback((control: OnboardingSkipControl) => {
    setSkipControl(control);
  }, []);

  return (
    <>
      <OnboardingProgress step={step} />
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium text-emerald-600">Account created</p>
            <h1 className="text-2xl font-bold text-slate-900">Complete your partner profile</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Tell us about yourself and set up where you want to receive IUL leads.
            </p>
          </div>
          {skipControl?.visible && (
            <button
              type="button"
              onClick={skipControl.onSkip}
              disabled={skipControl.disabled}
              className="btn-secondary btn-sm shrink-0 text-slate-500"
            >
              Skip this step
            </button>
          )}
        </div>
        <OnboardingForm
          initialProfile={initialProfile}
          step={step}
          onStepChange={setStep}
          onSkipControlChange={handleSkipControlChange}
        />
      </div>
    </>
  );
}
