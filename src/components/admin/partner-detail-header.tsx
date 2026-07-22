"use client";

import { useState } from "react";
import Link from "next/link";
import { ViewAsPartnerButton } from "@/components/admin/view-as-partner-button";
import {
  PartnerEditModal,
} from "@/components/admin/partner-edit-modal";
import type { PartnerEditFormInitial } from "@/components/admin/partner-edit-form";
import { ArrowLeft, PencilSimple, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

type PartnerDetailHeaderProps = {
  title: string;
  partnerId: string;
  displayName: string;
  editInitial: PartnerEditFormInitial;
};

export function PartnerDetailHeader({
  title,
  partnerId,
  displayName,
  editInitial,
}: PartnerDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
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
            onClick={() => setEditOpen(true)}
            className="btn-secondary btn-sm inline-flex items-center gap-1"
          >
            <PencilSimple size={14} weight={ICON_WEIGHT_LINEAR} aria-hidden />
            Edit account
          </button>
          <ViewAsPartnerButton partnerId={partnerId} label="View as partner" />
        </div>
      </div>

      {editOpen && (
        <PartnerEditModal
          partnerId={partnerId}
          displayName={displayName}
          initial={editInitial}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
