import { notFound } from "next/navigation";
import LeadSimulator from "./simulator-form";
import { DevBackLink, DevNavLink } from "@/components/dev/dev-nav-link";
import { Zap, Terminal } from "lucide-react";

export default function DevLeadSimulatorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dev header */}
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs font-semibold text-amber-700">
        🛠 Development Tool — Hidden in production
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Terminal size={18} className="text-slate-500" />
                Lead Simulator
              </h1>
              <p className="text-sm text-slate-500">POST test leads to <code className="bg-slate-100 rounded px-1 py-0.5 text-xs">/api/leads/intake</code></p>
            </div>
          </div>
          <div className="flex gap-2">
            <DevBackLink href="/admin/leads" label="Admin Leads" />
            <DevNavLink href="/admin" className="btn-secondary btn-sm">
              Dashboard
            </DevNavLink>
          </div>
        </div>

        <div className="card p-6">
          <LeadSimulator />
        </div>
      </div>
    </div>
  );
}
