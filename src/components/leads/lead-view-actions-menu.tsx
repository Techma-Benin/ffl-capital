"use client";

import { useState } from "react";
import { DotsThree, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export type LeadViewActionsHandlers = {
  onRename: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  isDefault: boolean;
};

const panelClassName =
  "z-50 w-44 rounded-xl border border-slate-100 bg-white py-1 shadow-lg";

export function LeadViewActionsMenuPanel({
  handlers,
  onClose,
  className,
  style,
}: {
  handlers: LeadViewActionsHandlers;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { onRename, onDuplicate, onSetDefault, onDelete, isDefault } =
    handlers;

  return (
    <div
      className={className ?? panelClassName}
      style={style}
      role="menu"
      aria-label="View actions"
    >
      <button
        type="button"
        role="menuitem"
        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        onClick={() => {
          onClose();
          onRename();
        }}
      >
        Edit
      </button>
      <button
        type="button"
        role="menuitem"
        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        onClick={() => {
          onClose();
          onDuplicate();
        }}
      >
        Duplicate
      </button>
      {!isDefault && (
        <button
          type="button"
          role="menuitem"
          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => {
            onClose();
            onSetDefault();
          }}
        >
          Set as default
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        onClick={() => {
          onClose();
          onDelete();
        }}
      >
        Delete
      </button>
    </div>
  );
}

export function MenuBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-hidden
    />
  );
}

export function LeadViewActionsMenu(handlers: LeadViewActionsHandlers) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="View actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <DotsThree size={20} weight={ICON_WEIGHT_LINEAR} />
      </button>
      {open && (
        <>
          <MenuBackdrop onClose={close} />
          <LeadViewActionsMenuPanel
            handlers={handlers}
            onClose={close}
            className={`absolute right-0 top-full mt-1 ${panelClassName}`}
          />
        </>
      )}
    </div>
  );
}
