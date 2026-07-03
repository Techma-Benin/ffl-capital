import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLeftPanel } from "@/components/auth/auth-left-panel";
import { authClerkAppearance } from "@/lib/auth/auth-clerk-appearance";
import { getPostAuthRedirectPath } from "@/lib/auth/redirect";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect(await getPostAuthRedirectPath());
  return (
    <div className="flex min-h-screen">
      <AuthLeftPanel subtitle="Partner Signup">
        <h1 className="text-4xl font-bold leading-tight">
          Start buying
          <br />
          <span className="text-brand-400">IUL leads today.</span>
        </h1>
        <p className="mt-4 max-w-sm text-sidebar-text leading-relaxed">
          Create your account, select your target states, fund your wallet, and start receiving matched leads automatically.
        </p>

        <div className="mt-10 space-y-5">
          {[
            { step: "1", label: "Create your account", desc: "Takes less than 2 minutes" },
            { step: "2", label: "Complete onboarding", desc: "Select target states & lead type" },
            { step: "3", label: "Get approved by admin", desc: "Usually same business day" },
            { step: "4", label: "Fund your wallet & go live", desc: "Leads match automatically" },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-sidebar-text">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </AuthLeftPanel>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-lg">
          <Link
            href="/sign-in"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={13} />
            Already have an account? Sign in
          </Link>

          <h2 className="mb-2 text-2xl font-bold text-slate-900">Create your account</h2>
          <p className="mb-6 text-sm text-slate-500">
            Join FFL Capital and start purchasing qualified IUL leads.
          </p>

          <SignUp forceRedirectUrl="/auth/continue" appearance={authClerkAppearance} />
        </div>
      </div>
    </div>
  );
}
