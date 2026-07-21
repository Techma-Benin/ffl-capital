"use client";

import { useState } from "react";
import { DotsThree, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function LeadViewActionsMenu({
  onRename,
  onDuplicate,
  onSetDefault,
  onDelete,
  isDefault,
}: {
  onRename: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  isDefault: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="View actions"
      >
        <DotsThree size={20} weight={ICON_WEIGHT_LINEAR} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              Rename / edit
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
            >
              Duplicate
            </button>
            {!isDefault && (
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  onSetDefault();
                }}
              >
                Set as default
              </button>
            )}
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
