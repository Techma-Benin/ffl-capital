"use client";

import Link from "next/link";
import { ViewAsPartnerButton } from "@/components/admin/view-as-partner-button";
import { BlockPartnerButton } from "@/components/admin/block-partner-button";
import { usePartnerDetailEdit } from "@/components/admin/partner-detail-edit-provider";
import {
  ArrowLeft,
  PencilSimple,
  ICON_WEIGHT,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";

type PartnerDetailHeaderProps = {
  title: string;
  partnerId: string;
  partnerStatus: string;
};

export function PartnerDetailHeader({
  title,
  partnerId,
  partnerStatus,
}: PartnerDetailHeaderProps) {
  const { openPartnerEdit } = usePartnerDetailEdit();

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
        <button
          type="button"
          onClick={openPartnerEdit}
          className="group btn-secondary btn-sm inline-flex items-center gap-1"
        >
          <PencilSimple
            size={14}
            weight={ICON_WEIGHT}
            className="text-slate-500 transition-colors group-hover:text-brand-600"
            aria-hidden
          />
          Edit account
        </button>
        <ViewAsPartnerButton partnerId={partnerId} label="View as partner" />
        <BlockPartnerButton partnerId={partnerId} status={partnerStatus} />
      </div>
    </div>
  );
}
