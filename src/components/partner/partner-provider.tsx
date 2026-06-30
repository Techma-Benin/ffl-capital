"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { PartnerSession } from "@/lib/partner/types";

type PartnerContextValue = {
  partner: PartnerSession;
  refreshPartner: () => Promise<void>;
  patchPartner: (patch: Partial<PartnerSession>) => void;
};

const PartnerContext = createContext<PartnerContextValue | null>(null);

export function PartnerProvider({
  initialPartner,
  children,
}: {
  initialPartner: PartnerSession;
  children: React.ReactNode;
}) {
  const [partner, setPartner] = useState(initialPartner);

  const refreshPartner = useCallback(async () => {
    const res = await fetch("/api/partners/me", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as PartnerSession;
    setPartner(data);
  }, []);

  const patchPartner = useCallback((patch: Partial<PartnerSession>) => {
    setPartner((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ partner, refreshPartner, patchPartner }),
    [partner, refreshPartner, patchPartner],
  );

  return (
    <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>
  );
}

export function usePartner() {
  const ctx = useContext(PartnerContext);
  if (!ctx) {
    throw new Error("usePartner must be used within PartnerProvider");
  }
  return ctx;
}
