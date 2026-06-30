import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/auth/session";
import OnboardingForm from "./onboarding-form";
import { Zap } from "lucide-react";
import Link from "next/link";

export default async function OnboardingPage() {
  const partner = await getCurrentPartner();
  if (partner) redirect("/partner");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">FFL Capital</span>
        </div>
        <Link href="/sign-in" className="text-xs font-medium text-slate-500 hover:text-slate-700">
          Already have an account? Sign in →
        </Link>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {["Account Created", "Complete Profile", "Admin Review", "Go Live"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i === 1
                        ? "bg-brand-700 text-white"
                        : i < 1
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {i < 1 ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${
                    i === 1 ? "text-brand-700" : i < 1 ? "text-emerald-600" : "text-slate-400"
                  }`}>
                    {s}
                  </span>
                </div>
                {i < 3 && (
                  <div className={`mx-1 mb-4 h-px w-8 sm:w-12 ${i < 1 ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Complete your partner profile</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Tell us about yourself and choose the states where you want to receive IUL leads.
              Admin approval is required before you go live.
            </p>
          </div>

          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
