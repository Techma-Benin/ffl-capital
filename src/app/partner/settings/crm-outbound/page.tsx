"use client";

import { useState } from "react";
import Link from "next/link";
import { PartnerCrmOutboundWizard } from "@/components/partner/partner-crm-outbound-wizard";

const C_DONE_FG = "#25B67C";

export default function PartnerCrmOutboundSettingsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const pillStyle =
    enabled
      ? { background: "rgba(37,182,124,0.12)", color: C_DONE_FG }
      : { background: "#f2f1f8", color: "#8b8a99" };

  return (
    <div>
      {/* Breadcrumb row with enable pill */}
      <div className="mb-5 flex items-center gap-1.5">
        <nav className="flex flex-1 items-center gap-1.5 text-sm">
          <Link
            href="/partner/settings"
            className="font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Settings
          </Link>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-600">CRM Outbound</span>
        </nav>

        {enabled !== null && (
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold transition-colors"
            style={pillStyle}
          >
            <span
              className="relative inline-block h-5 w-9 flex-shrink-0 rounded-full transition-colors"
              style={{ background: enabled ? C_DONE_FG : "#d7d6e0" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all"
                style={{ left: enabled ? "calc(100% - 18px)" : "2px" }}
              />
            </span>
            {enabled ? "Enabled" : "Disabled"}
          </button>
        )}
      </div>

      <PartnerCrmOutboundWizard
        sectionClass="card scroll-mt-6 overflow-hidden"
        showPageChrome={false}
        controlledEnabled={enabled ?? false}
        onEnabledChange={setEnabled}
      />
    </div>
  );
}
