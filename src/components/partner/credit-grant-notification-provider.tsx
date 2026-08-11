"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditGrantNotificationModal } from "@/components/partner/credit-grant-notification-modal";
import {
  aggregateGrantNotifications,
  type GrantNotification,
} from "@/lib/wallet/grant-notification";

type Props = {
  enabled: boolean;
  initialNotifications?: GrantNotification[];
};

export function CreditGrantNotificationProvider({
  enabled,
  initialNotifications = [],
}: Props) {
  const [queue, setQueue] = useState<GrantNotification[]>(initialNotifications);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function loadNotifications() {
      const res = await fetch("/api/partner/grant-notifications", {
        cache: "no-store",
      });
      if (!res.ok || cancelled) return;

      const data = (await res.json()) as { notifications: GrantNotification[] };
      setQueue(data.notifications);
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const aggregated = useMemo(
    () => (enabled ? aggregateGrantNotifications(queue) : null),
    [enabled, queue],
  );

  const acknowledgeAll = useCallback(async () => {
    if (!aggregated || acknowledging) return;

    const ids = aggregated.ids;
    setAcknowledging(true);
    // Clear immediately so the partner only ever sees one combined modal.
    setQueue([]);
    try {
      await fetch("/api/partner/grant-notifications/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } finally {
      setAcknowledging(false);
    }
  }, [acknowledging, aggregated]);

  const handleDismiss = useCallback(() => {
    void acknowledgeAll();
  }, [acknowledgeAll]);

  return (
    <CreditGrantNotificationModal
      open={Boolean(aggregated)}
      notification={aggregated}
      onDismiss={handleDismiss}
      acknowledging={acknowledging}
    />
  );
}
