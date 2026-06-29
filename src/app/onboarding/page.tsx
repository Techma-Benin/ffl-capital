import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/auth/session";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const partner = await getCurrentPartner();
  if (partner) redirect("/partner");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-xl font-semibold">Partner onboarding</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Complete your profile. Admin approval may be required before receiving leads.
      </p>
      <div className="mt-6">
        <OnboardingForm />
      </div>
    </main>
  );
}
