import { notFound } from "next/navigation";
import LeadSimulator from "./simulator-form";

export default function DevLeadSimulatorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Lead Simulator (dev only)</h1>
      <p className="mt-2 text-sm text-neutral-600">
        POST test leads to /api/leads/intake
      </p>
      <LeadSimulator />
    </main>
  );
}
