"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditGrantNotificationModal } from "@/components/partner/credit-grant-notification-modal";
import type { GrantNotification } from "@/lib/wallet/grant-notification";

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

  const current = enabled && queue.length > 0 ? queue[0] : null;

  const acknowledgeCurrent = useCallback(async () => {
    if (!current || acknowledging) return;

    setAcknowledging(true);
    try {
      const res = await fetch(
        `/api/partner/grant-notifications/${current.id}/acknowledge`,
        { method: "POST" },
      );

      if (res.ok || res.status === 409) {
        setQueue((prev) => prev.filter((item) => item.id !== current.id));
      }
    } finally {
      setAcknowledging(false);
    }
  }, [acknowledging, current]);

  const handleDismiss = useCallback(() => {
    void acknowledgeCurrent();
  }, [acknowledgeCurrent]);

  return (
    <CreditGrantNotificationModal
      open={Boolean(current)}
      notification={current}
      onDismiss={handleDismiss}
      acknowledging={acknowledging}
    />
  );
}
