"use client";

import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/ui/form-skeleton";
import type { LeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";

// Skip SSR for the form: it is auth-gated and heavy with client state.
// This prevents the Clerk/Next.js Suspense boundary from triggering an
// "Invalid hook call" during server rendering, which was causing a
// hydration crash every time an authenticated user landed on this page.
// `next/dynamic(..., { ssr: false })` must live in a Client Component in
// Next.js 15 — it can no longer be called directly inside an async Server
// Component, so this wrapper exists solely to host that call.
const OnboardingWizard = dynamic(() => import("./onboarding-wizard"), {
  ssr: false,
  loading: () => (
    <div className="space-y-8">
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" aria-hidden />
      <div className="card p-6 sm:p-8">
        <FormSkeleton />
      </div>
    </div>
  ),
});

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

export function OnboardingWizardLoader({
  initialProfile,
  criteriaOptions,
  categories,
}: Props) {
  return (
    <OnboardingWizard
      initialProfile={initialProfile}
      criteriaOptions={criteriaOptions}
      categories={categories}
    />
  );
}
