import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import {
  getCurrentPartner,
  isPartnerActive,
  isAdminApprovalRequired,
} from "@/lib/auth/session";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { Bell, AlertCircle } from "lucide-react";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/onboarding");

  const active = isPartnerActive(partner);
  const approvalRequired = isAdminApprovalRequired();
  const isPending = partner.status === "pending_approval";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <PartnerSidebar
        partnerName={`${partner.firstName} ${partner.lastName}`}
        affiliation={partner.affiliation}
        status={partner.status}
        balance={Number(partner.walletBalance)}
      />

      {/* Right column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2">
            {active ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Lead buying active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Lead buying inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-ghost btn-sm rounded-full p-2" aria-label="Notifications">
              <Bell size={17} className="text-slate-500" />
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        {/* Pending approval banner */}
        {approvalRequired && isPending && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
            <AlertCircle size={15} className="flex-shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Account pending approval.</span>{" "}
              You won&apos;t receive leads until an admin activates your account. Please ensure you have at least 15 states selected.
            </p>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
