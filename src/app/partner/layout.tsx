import { redirect } from "next/navigation";
import {
  isAdminApprovalRequired,
} from "@/lib/auth/session";
import { getPartnerSession, getImpersonatedPartnerName } from "@/lib/partner/session";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { PartnerProvider } from "@/components/partner/partner-provider";
import { PortalShell } from "@/components/layout/portal-shell";
import { MainContent } from "@/components/layout/main-content";
import { ImpersonationBanner } from "@/components/partner/impersonation-banner";
import { PendingApprovalBanner } from "@/components/partner/pending-approval-banner";
import { currentUser } from "@clerk/nextjs/server";
import { getRoleFromMetadata } from "@/lib/auth/roles";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getPartnerSession();
  if (!partner) {
    const user = await currentUser();
    const role = getRoleFromMetadata(user?.publicMetadata as Record<string, unknown>);
    if (role === "admin") redirect("/admin");
    redirect("/onboarding");
  }

  const approvalRequired = isAdminApprovalRequired();
  const isPending = partner.status === "pending_approval";
  const impersonatedName = await getImpersonatedPartnerName();

  return (
    <PortalShell>
      <PartnerProvider initialPartner={partner}>
        <div className="flex h-screen overflow-hidden bg-transparent">
          <PartnerSidebar />

          <div className="flex flex-1 flex-col overflow-hidden">
            {impersonatedName && (
              <ImpersonationBanner partnerName={impersonatedName} />
            )}

            {approvalRequired && isPending && <PendingApprovalBanner />}

            <MainContent>{children}</MainContent>
          </div>
        </div>
      </PartnerProvider>
    </PortalShell>
  );
}
