"use client";

import { useState, useEffect, useCallback } from "react";

export type AdminProfile = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

/**
 * Fetches the authenticated admin's profile from the DB (admin_profiles table).
 * Falls back to Clerk data on first login before the row exists.
 */
export function useAdminProfile() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as AdminProfile;
        setProfile(data);
      }
    } catch {
      // Non-fatal; UI falls back to Clerk via SidebarUserButton.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const patchProfile = useCallback((patch: Partial<AdminProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return { profile, loading, refetch: fetchProfile, patchProfile };
}
