"use client";

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useUser } from "@clerk/nextjs";
import { createPortal } from "react-dom";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { useProfileUpdate } from "@/hooks/use-profile-update";
import { notify } from "@/lib/notify";
import { PartnerAvatar } from "@/components/admin/partner-avatar";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ManageAccountModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial values loaded from the DB. */
  initialFirstName?: string;
  initialLastName?: string;
  initialAvatarUrl?: string | null;
  initialAffiliation?: string;
  /** When false, hides the affiliation field (admin accounts). */
  showAffiliation?: boolean;
  /** Called after a successful save with the updated values. */
  onSaved?: (data: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    affiliation?: string;
  }) => void;
  /**
   * When true, PATCH /api/partners/me (partner DB row + Clerk).
   * When false, PATCH /api/user/me (admin_profiles row + Clerk).
   */
  syncToDb?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManageAccountModal({
  open,
  onOpenChange,
  initialFirstName = "",
  initialLastName = "",
  initialAvatarUrl = null,
  initialAffiliation = "",
  showAffiliation = true,
  onSaved,
  syncToDb = true,
}: ManageAccountModalProps) {
  const { user } = useUser();
  const { save, saving } = useProfileUpdate({ syncToDb });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [affiliation, setAffiliation] = useState("");

  // Avatar state
  // localPreview: blob URL shown immediately when a file is picked
  // pendingAvatarUrl: Clerk CDN URL returned after a successful upload
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Reset form when modal opens.
  useEffect(() => {
    if (!open) return;
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setAffiliation(initialAffiliation);
    setLocalPreview(null);
    setPendingAvatarUrl(null);
  }, [open, initialFirstName, initialLastName, initialAffiliation]);

  // Body scroll lock + initial focus.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    // Show a local blob preview immediately.
    setLocalPreview(URL.createObjectURL(file));

    try {
      await user.setProfileImage({ file });
      // After upload, user.imageUrl is refreshed by Clerk — persist this CDN URL.
      setPendingAvatarUrl(user.imageUrl ?? null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to upload image.";
      notify.error(msg);
      setLocalPreview(null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const ok = await save({
      firstName,
      lastName,
      ...(showAffiliation && { affiliation }),
      // Only include avatarUrl if an upload happened this session.
      ...(pendingAvatarUrl !== null && { avatarUrl: pendingAvatarUrl }),
    });

    if (ok) {
      notify.success("Profile updated");
      onSaved?.({
        firstName,
        lastName,
        avatarUrl: pendingAvatarUrl ?? initialAvatarUrl ?? null,
        ...(showAffiliation && { affiliation }),
      });
      onOpenChange(false);
    }
  }

  // Avatar to display: local blob preview > newly uploaded Clerk URL > DB URL > Clerk fallback
  // Clerk imageUrl is used as a last resort so new accounts (no DB row yet) still see their photo.
  const displayAvatarUrl = localPreview ?? pendingAvatarUrl ?? initialAvatarUrl ?? user?.imageUrl ?? null;

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
        e.stopPropagation();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-account-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2
            id="manage-account-title"
            className="text-sm font-semibold text-slate-900"
          >
            Manage Account
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Close"
          >
            <X size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <form
            id="manage-account-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <PartnerAvatar
                  avatarUrl={displayAvatarUrl}
                  firstName={firstName}
                  lastName={lastName}
                  size="lg"
                />
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                    <span className="text-xs text-slate-500">…</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors disabled:opacity-50"
              >
                {avatarUploading ? "Uploading…" : "Change photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
                aria-label="Upload profile photo"
              />
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-line w-full"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-line w-full"
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Company — partners only */}
            {showAffiliation && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  Company / Affiliation
                </label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  className="input-line w-full"
                  placeholder="e.g. Acme Insurance"
                  autoComplete="organization"
                />
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="manage-account-form"
            disabled={saving}
            className="btn-primary btn-sm"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
