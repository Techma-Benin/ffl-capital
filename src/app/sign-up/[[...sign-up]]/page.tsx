import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPostAuthRedirectPath } from "@/lib/auth/redirect";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect(await getPostAuthRedirectPath());
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-sidebar-bg p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">FFL Capital</p>
            <p className="text-xs text-sidebar-text">Partner Signup</p>
          </div>
        </div>

        <div className="mt-auto">
          <h1 className="text-4xl font-bold leading-tight">
            Start buying
            <br />
            <span className="text-brand-400">IUL leads today.</span>
          </h1>
          <p className="mt-4 text-sidebar-text leading-relaxed max-w-sm">
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
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
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

          <SignUp
            forceRedirectUrl="/auth/continue"
            appearance={{
              elements: {
                card: "shadow-none border-0 p-0 bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors rounded-lg text-sm font-medium h-10",
                dividerRow: "my-4",
                formFieldInput: "form-input",
                formFieldLabel: "form-label",
                formButtonPrimary: "btn-primary w-full justify-center h-10 text-sm",
                footerAction: "text-sm text-slate-500",
                footerActionLink: "text-brand-600 hover:underline font-medium",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
