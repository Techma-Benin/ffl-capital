"use client";

import { useState } from "react";
import { notify } from "@/lib/notify";

export type ProfileUpdateData = {
  firstName: string;
  lastName: string;
  affiliation?: string;
  avatarUrl?: string | null;
};

export type UseProfileUpdateResult = {
  save: (data: ProfileUpdateData) => Promise<boolean>;
  saving: boolean;
};

/**
 * Orchestrates the profile save.
 *
 * Partner path (syncToDb=true):
 *   PATCH /api/partners/me — updates the DB row AND syncs names to Clerk
 *   server-side via the admin client (bypasses instance restrictions).
 *
 * Admin path (syncToDb=false):
 *   PATCH /api/user/me — upserts admin_profiles row AND syncs to Clerk.
 *
 * Client-side user.update() is intentionally NOT called: the Clerk instance
 * typically has name editing disabled at the dashboard level. The server-side
 * admin client always works.
 */
export function useProfileUpdate({
  syncToDb = true,
}: { syncToDb?: boolean } = {}): UseProfileUpdateResult {
  const [saving, setSaving] = useState(false);

  async function save(data: ProfileUpdateData): Promise<boolean> {
    setSaving(true);

    try {
      const endpoint = syncToDb ? "/api/partners/me" : "/api/user/me";
      const body: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      if (syncToDb && data.affiliation !== undefined) {
        body.affiliation = data.affiliation;
      }
      if (data.avatarUrl !== undefined) {
        body.avatarUrl = data.avatarUrl;
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ?? "Failed to update profile.",
        );
      }

      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      notify.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { save, saving };
}
