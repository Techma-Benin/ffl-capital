"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Funnel, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { formatUsd, moneyCellClass, moneyHeaderClassName } from "@/lib/format-money";
import { adminPartnerFilterSetEditPath } from "@/lib/filter-sets/routes";
import type { FilterCriteria } from "@/lib/matching/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterListRow = {
  fs: {
    id: string;
    partnerId: string;
    name: string;
    leadType: string;
    filterStates: string[];
    priority: number;
    priceOverride: string | null;
    active: boolean;
    weeklyLimit: number | null;
    monthlyLimit: number | null;
    filterCriteria: FilterCriteria;
    partner: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      status: string;
      walletBalance: string;
    };
  };
  usage: { weekly: number; monthly: number };
  price: number;
};

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function FilterListTable({
  initialRows,
}: {
  initialRows: FilterListRow[];
  sources?: string[];
}) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Funnel size={15} className="text-slate-400" weight={ICON_WEIGHT_LINEAR} />
        Partner Filter Sets
      </h2>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Filter Set</th>
              <th className="w-44">Partner</th>
              <th>Lead Type</th>
              <th>States</th>
              <th>Priority</th>
              <th className={moneyHeaderClassName}>Price</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  No filter sets configured
                </td>
              </tr>
            ) : (
              initialRows.map((row) => {
                const { fs, price } = row;
                const editHref = adminPartnerFilterSetEditPath(
                  fs.partnerId,
                  fs.id,
                  "/admin/filter-list",
                );

                return (
                  <tr
                    key={fs.id}
                    className="cursor-pointer transition-colors hover:bg-brand-50"
                  >
                    <td>
                      <Link
                        href={editHref}
                        className="flex items-center gap-1.5 font-medium text-slate-900 hover:text-brand-700"
                      >
                        <span>{fs.name}</span>
                        {fs.active && fs.partner.status === "active" ? (
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500"
                            title="Active"
                          />
                        ) : (
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-300"
                            title="Inactive"
                          />
                        )}
                      </Link>
                    </td>
                    <td className="w-44 max-w-[11rem]">
                      <Link
                        href={`/admin/partners/${fs.partnerId}`}
                        className="block hover:text-brand-600"
                      >
                        <p className="truncate font-medium text-slate-900">
                          {fs.partner.firstName} {fs.partner.lastName}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {fs.partner.email}
                        </p>
                      </Link>
                    </td>
                    <td>
                      <Link href={editHref} className="block">
                        <Badge variant="blue">
                          {fs.leadType === "traditional_iul"
                            ? "Trad. IUL"
                            : "High Intent"}
                        </Badge>
                      </Link>
                    </td>
                    <td>
                      <Link href={editHref} className="block">
                        {fs.filterStates.length}
                      </Link>
                    </td>
                    <td>
                      <Link href={editHref} className="block">
                        {fs.priority}
                      </Link>
                    </td>
                    <td className={moneyCellClass("font-semibold")}>
                      <Link href={editHref} className="block">
                        {formatUsd(price)}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
