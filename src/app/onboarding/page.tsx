import dynamic from "next/dynamic";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/auth/session";
import { getRoleFromMetadata } from "@/lib/auth/roles";
import { FormSkeleton } from "@/components/ui/form-skeleton";
import { Lightning } from "@/lib/icons/ssr";
import { AuthContinueRedirect } from "@/app/auth/continue/redirect";

// Skip SSR for the form: it is auth-gated and heavy with client state.
// This prevents the Clerk/Next.js Suspense boundary from triggering an
// "Invalid hook call" during server rendering, which was causing a
// hydration crash every time an authenticated user landed on this page.
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

export default async function OnboardingPage() {
  const user = await currentUser();
  const role = getRoleFromMetadata(user?.publicMetadata as Record<string, unknown>);
  if (role === "admin") redirect("/admin");

  const partner = await getCurrentPartner();
  // Use client-side redirect to avoid throwing NEXT_REDIRECT in the RSC layer,
  // which triggers the dev-mode error overlay (non-issue in production but
  // confusing during development).
  if (partner) return <AuthContinueRedirect to="/partner" />;
  const fullName = user?.fullName?.trim() ?? "";
  const [fallbackFirst = "", ...fallbackRest] = fullName ? fullName.split(/\s+/) : [];
  const initialProfile = {
    firstName: user?.firstName ?? fallbackFirst,
    lastName: user?.lastName ?? fallbackRest.join(" "),
    email: user?.emailAddresses[0]?.emailAddress ?? "",
  };

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700">
            <Lightning size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-brand-800">FFL Capital</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Signed in</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <OnboardingWizard initialProfile={initialProfile} />
      </div>
    </div>
  );
}
