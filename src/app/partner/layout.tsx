import { redirect } from "next/navigation";
import {
  isAdminApprovalRequired,
} from "@/lib/auth/session";
import { getPartnerSession } from "@/lib/partner/session";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { PartnerProvider } from "@/components/partner/partner-provider";
import { PartnerStatusBar } from "@/components/partner/partner-status-bar";
import { PortalShell } from "@/components/layout/portal-shell";
import { MainContent } from "@/components/layout/main-content";
import { AlertCircle } from "lucide-react";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/onboarding");

  const approvalRequired = isAdminApprovalRequired();
  const isPending = partner.status === "pending_approval";

  return (
    <PortalShell>
      <PartnerProvider initialPartner={partner}>
        <div className="flex h-screen overflow-hidden bg-page">
          <PartnerSidebar />

          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-16 items-center justify-between border-b border-sidebar-border bg-white px-6">
              <PartnerStatusBar />
              <div className="flex items-center gap-3" />
            </header>

            {approvalRequired && isPending && (
              <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
                <AlertCircle size={15} className="flex-shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Account pending approval.</span>{" "}
                  You won&apos;t receive leads until an admin activates your account. Please ensure you have at least 15 states selected.
                </p>
              </div>
            )}

            <MainContent>{children}</MainContent>
          </div>
        </div>
      </PartnerProvider>
    </PortalShell>
  );
}
