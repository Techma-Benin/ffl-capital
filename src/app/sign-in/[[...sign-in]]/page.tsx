import { SignIn } from "@clerk/nextjs";
import { Zap } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
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
            <p className="text-xs text-sidebar-text">Lead Distribution Platform</p>
          </div>
        </div>

        <div className="mt-auto">
          <h1 className="text-4xl font-bold leading-tight">
            Distribute leads
            <br />
            <span className="text-brand-400">faster and smarter.</span>
          </h1>
          <p className="mt-4 text-sidebar-text leading-relaxed max-w-sm">
            Real-time matching, aged lead marketplace, and a modern portal for every partner — all in one platform.
          </p>

          <div className="mt-10 space-y-4">
            {[
              "~500 IUL leads distributed daily",
              "Automatic state + priority matching",
              "Self-service aged leads from $5",
              "TrustedForm compliance on every lead",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold">
                  ✓
                </div>
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700">
              <Zap size={20} className="text-white" />
            </div>
            <p className="text-sm font-bold text-slate-900">FFL Capital</p>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mb-6 text-sm text-slate-500">
            Sign in to access your portal.{" "}
            <Link href="/sign-up" className="text-brand-600 hover:underline font-medium">
              New partner? Sign up
            </Link>
          </p>

          <SignIn
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
