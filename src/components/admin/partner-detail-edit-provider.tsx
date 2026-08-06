"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { PartnerEditModal } from "@/components/admin/partner-edit-modal";
import type { PartnerEditFormInitial } from "@/components/admin/partner-edit-form";

type PartnerDetailEditContextValue = {
  openPartnerEdit: () => void;
};

const PartnerDetailEditContext = createContext<PartnerDetailEditContextValue | null>(
  null,
);

export function usePartnerDetailEdit() {
  const ctx = useContext(PartnerDetailEditContext);
  if (!ctx) {
    throw new Error("usePartnerDetailEdit must be used within PartnerDetailEditProvider");
  }
  return ctx;
}

type PartnerDetailEditProviderProps = {
  partnerId: string;
  displayName: string;
  editInitial: PartnerEditFormInitial;
  children: ReactNode;
};

export function PartnerDetailEditProvider({
  partnerId,
  displayName,
  editInitial,
  children,
}: PartnerDetailEditProviderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const openPartnerEdit = useCallback(() => setEditOpen(true), []);

  return (
    <PartnerDetailEditContext.Provider value={{ openPartnerEdit }}>
      {children}
      {editOpen && (
        <PartnerEditModal
          partnerId={partnerId}
          displayName={displayName}
          initial={editInitial}
          onClose={() => setEditOpen(false)}
        />
      )}
    </PartnerDetailEditContext.Provider>
  );
}
