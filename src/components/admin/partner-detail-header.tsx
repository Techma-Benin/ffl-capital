"use client";

import Link from "next/link";
import { ViewAsPartnerButton } from "@/components/admin/view-as-partner-button";
import { ArrowLeft, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

type PartnerDetailHeaderProps = {
  title: string;
  partnerId: string;
};

export function PartnerDetailHeader({ title, partnerId }: PartnerDetailHeaderProps) {
  function scrollToEdit() {
    document.getElementById("partner-account-edit")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const firstInput = document.querySelector<HTMLElement>(
      "#partner-account-edit input, #partner-account-edit select",
    );
    firstInput?.focus({ preventScroll: true });
  }

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link
          href="/admin/partners"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft size={14} weight={ICON_WEIGHT_LINEAR} />
          All partners
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={scrollToEdit} className="btn-secondary btn-sm">
          Edit account
        </button>
        <ViewAsPartnerButton partnerId={partnerId} label="View as partner" />
      </div>
    </div>
  );
}
