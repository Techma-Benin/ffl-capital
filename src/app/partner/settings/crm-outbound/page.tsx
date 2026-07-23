"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PartnerCrmOutboundWizard } from "@/components/partner/partner-crm-outbound-wizard";
import { ArrowLeft, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export default function PartnerCrmOutboundSettingsPage() {
  return (
    <div>
      <PageHeader
        title="CRM outbound"
        subtitle="Configure an optional JSON POST to your CRM when a lead matches."
        action={
          <Link
            href="/partner/settings"
            className="btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={16} weight={ICON_WEIGHT_LINEAR} />
            Back to settings
          </Link>
        }
      />
      <PartnerCrmOutboundWizard
        sectionClass="card scroll-mt-6 overflow-hidden"
        showPageChrome={false}
      />
    </div>
  );
}
