"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SendLeadsToPartnerDialog } from "@/components/admin/send-leads-to-partner-dialog";

export function useAdminSendToPartner(onSuccess?: () => void) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leadIds, setLeadIds] = useState<string[]>([]);

  const sendLeadsToPartner = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setLeadIds(ids);
    setOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    router.refresh();
  }, [onSuccess, router]);

  const dialog = (
    <SendLeadsToPartnerDialog
      open={open}
      onOpenChange={setOpen}
      leadIds={leadIds}
      onSuccess={handleSuccess}
    />
  );

  return { sendLeadsToPartner, dialog };
}
