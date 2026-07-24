"use client";

import { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { usePortal } from "@/components/layout/portal-provider";
import { PartnerAvatar } from "@/components/admin/partner-avatar";
import { ICON_WEIGHT_LINEAR, Gear, Power } from "@/lib/icons/client";

type DropdownPosition = { top: number; left: number; width: number };

/** Full-screen overlay shown while Clerk sign-out is in progress. */
function SignOutOverlay() {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Skeleton bars */}
      <div className="w-64 space-y-3 animate-pulse">
        <div className="h-4 rounded-full bg-slate-200" />
        <div className="h-4 rounded-full bg-slate-200 w-5/6" />
        <div className="h-4 rounded-full bg-slate-200 w-4/6" />
      </div>
      <p className="mt-5 text-sm text-slate-400">Signing out…</p>
    </div>,
    document.body,
  );
}

export function SidebarUserButton({
  afterSignOutUrl = "/sign-in",
  displayName,
  avatarUrl,
  isActive,
  onManageAccount,
}: {
  afterSignOutUrl?: string;
  /** Optional override (e.g. partner DB name). Falls back to Clerk profile. */
  displayName?: string;
  /**
   * Avatar URL from the database. When provided, used instead of Clerk's
   * imageUrl so the DB is the visual source of truth.
   */
  avatarUrl?: string | null;
  /** When true, shows a small green indicator dot after the name. */
  isActive?: boolean;
  /** When provided, "Manage Account" appears in the dropdown and calls this. */
  onManageAccount?: () => void;
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { sidebarCollapsed } = usePortal();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPosition | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const name =
    displayName ||
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  const firstName = user?.firstName ?? displayName?.split(" ")[0] ?? "";
  const lastName =
    user?.lastName ?? (displayName?.split(" ").slice(1).join(" ") ?? "");

  function openDropdown() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.top - 8,
        left: rect.left,
        width: Math.max(rect.width, 176),
      });
    }
    setDropdownOpen(true);
  }

  function closeDropdown() {
    setDropdownOpen(false);
    setPos(null);
  }

  // Close on outside click — exclude both trigger and portal menu.
  useEffect(() => {
    if (!dropdownOpen) return;
    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) closeDropdown();
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [dropdownOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!dropdownOpen) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") closeDropdown();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dropdownOpen]);

  function handleManageAccount() {
    closeDropdown();
    onManageAccount?.();
  }

  async function handleSignOut() {
    closeDropdown();
    setSigningOut(true);
    await signOut({ redirectUrl: afterSignOutUrl });
  }

  // Prefer DB-supplied URL; fall back to Clerk's imageUrl when DB has no value yet
  // (null = not yet saved, undefined = prop not passed at all).
  const resolvedAvatarUrl = (avatarUrl != null) ? avatarUrl : (user?.imageUrl ?? null);

  const dropdown =
    dropdownOpen && pos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              transform: "translateY(-100%)",
              zIndex: 200,
            }}
            className="w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
          >
            {onManageAccount && (
              <button
                type="button"
                role="menuitem"
                onClick={handleManageAccount}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Gear
                  size={15}
                  weight={ICON_WEIGHT_LINEAR}
                  className="shrink-0 text-slate-400"
                />
                Manage Account
              </button>
            )}
            {onManageAccount && (
              <div className="my-1 border-t border-slate-100" />
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Power size={15} weight={ICON_WEIGHT_LINEAR} className="shrink-0" />
              Log out
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {signingOut && <SignOutOverlay />}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (dropdownOpen ? closeDropdown() : openDropdown())}
        disabled={signingOut}
        className={clsx(
          "flex w-full items-center rounded-lg px-1 py-1 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
          sidebarCollapsed ? "justify-center" : "gap-3",
        )}
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        aria-label="Account menu"
      >
        <PartnerAvatar
          avatarUrl={resolvedAvatarUrl}
          firstName={firstName}
          lastName={lastName}
          size="sm"
          className="h-9 w-9 shrink-0 text-sm"
        />

        <div
          className={clsx(
            "min-w-0 overflow-hidden transition-all duration-300",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
          )}
        >
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-800">
            <span className="truncate">{name}</span>
            {isActive !== undefined && (
              <span
                className={clsx(
                  "inline-block h-2 w-2 flex-shrink-0 rounded-full",
                  isActive ? "bg-emerald-500" : "bg-slate-300",
                )}
              />
            )}
          </p>
        </div>
      </button>

      {dropdown}
    </>
  );
}
