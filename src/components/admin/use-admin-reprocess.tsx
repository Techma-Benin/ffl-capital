"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { BulkReprocessPartnersDialog } from "@/components/admin/bulk-reprocess-partners-dialog";
import { notify } from "@/lib/notify";

type UseAdminReprocessOptions = {
  reprocessPartnerPickerEnabled: boolean;
  onSuccess?: () => void;
};

async function directReprocess(leadIds: string[]) {
  const res = await fetch("/api/admin/leads/bulk-reprocess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadIds }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Reprocess failed");
  }
  return res.json() as Promise<{
    processed: number;
    matched: number;
    errors: number;
    unmatched: number;
  }>;
}

function notifyReprocessResult(data: {
  processed: number;
  matched: number;
  errors: number;
  unmatched: number;
}) {
  if (data.errors === 0) {
    notify.success(
      `${data.matched} matched, ${data.unmatched} still unmatched (${data.processed} processed).`,
    );
  } else {
    notify.error(
      `${data.matched} matched, ${data.unmatched} unmatched, ${data.errors} failed.`,
    );
  }
}

async function resolveShouldShowPicker(leadIds: string[]): Promise<boolean> {
  const res = await fetch("/api/admin/leads/bulk-reprocess/partner-route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadIds }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { partnerPrimary?: boolean };
  return Boolean(data.partnerPrimary);
}

export function useAdminReprocess({
  reprocessPartnerPickerEnabled,
  onSuccess,
}: UseAdminReprocessOptions) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLeadIds, setDialogLeadIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    router.refresh();
  }, [onSuccess, router]);

  const reprocessLeads = useCallback(
    async (leadIds: string[]) => {
      if (leadIds.length === 0 || pending || dialogOpen) return;

      if (reprocessPartnerPickerEnabled) {
        try {
          const showPicker = await resolveShouldShowPicker(leadIds);
          if (!showPicker) {
            setPending(true);
            try {
              const data = await directReprocess(leadIds);
              notifyReprocessResult(data);
              handleSuccess();
            } finally {
              setPending(false);
            }
            return;
          }

          const res = await fetch("/api/admin/leads/bulk-reprocess/hold", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadIds }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(
              data.error ?? "Failed to reserve leads for reprocessing",
            );
          }
          setDialogLeadIds(leadIds);
          setDialogOpen(true);
        } catch (err) {
          notify.error(
            err instanceof Error
              ? err.message
              : "Failed to start reprocess. Please try again.",
          );
        }
        return;
      }

      setPending(true);
      try {
        const data = await directReprocess(leadIds);
        notifyReprocessResult(data);
        handleSuccess();
      } catch (err) {
        notify.error(
          err instanceof Error
            ? err.message
            : "Reprocess failed. Please try again.",
        );
      } finally {
        setPending(false);
      }
    },
    [reprocessPartnerPickerEnabled, pending, dialogOpen, handleSuccess],
  );

  const reprocessDialog = (
    <BulkReprocessPartnersDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      leadIds={dialogLeadIds}
      leadCount={dialogLeadIds.length}
      onSuccess={handleSuccess}
    />
  );

  return { reprocessLeads, reprocessDialog, pending };
}
