export const MIN_REALTIME_SELLS = 1;
export const MAX_REALTIME_SELLS = 20;
export const DEFAULT_MAX_REALTIME_SELLS = 1;

export type RealtimeSaleDelivery = {
  partnerId: string;
  channel: string;
  refundedAt: Date | string | null;
};

export function countNonRefundedRealtimeSales(
  deliveries: RealtimeSaleDelivery[],
): number {
  return deliveries.filter(
    (delivery) => delivery.channel === "realtime" && delivery.refundedAt == null,
  ).length;
}

export function uniquePartnerIdsWithNonRefundedRealtimeSale(
  deliveries: RealtimeSaleDelivery[],
): string[] {
  return [
    ...new Set(
      deliveries
        .filter(
          (delivery) =>
            delivery.channel === "realtime" && delivery.refundedAt == null,
        )
        .map((delivery) => delivery.partnerId),
    ),
  ];
}

export function partnerOwnsNonRefundedRealtimeSale(
  deliveries: RealtimeSaleDelivery[],
  partnerId: string,
): boolean {
  return uniquePartnerIdsWithNonRefundedRealtimeSale(deliveries).includes(
    partnerId,
  );
}

export function canAcceptAnotherRealtimeSale(
  soldCount: number,
  maxRealtimeSells: number,
): boolean {
  return remainingRealtimeResales(soldCount, maxRealtimeSells) > 0;
}

/** Sales already used on this lead. Delivered with no counted copy still uses 1 slot. */
export function realtimeSalesOnLead(input: {
  deliveries: RealtimeSaleDelivery[];
  status?: string;
}): number {
  const counted = countNonRefundedRealtimeSales(input.deliveries);
  if (counted > 0) return counted;
  if (input.status === "delivered") return 1;
  return 0;
}

export function remainingRealtimeResales(
  soldCount: number,
  maxRealtimeSells: number,
): number {
  const max = Math.max(0, maxRealtimeSells);
  return Math.max(0, max - soldCount);
}

export type RealtimeSaleGuardInput = {
  status: string;
  leadType: string | null | undefined;
  categoryResolution: string;
  maxRealtimeSells: number;
  soldCount: number;
  alreadySoldToPartner: boolean;
};

export type RealtimeSaleGuardResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function evaluateRealtimeSaleGuard(
  input: RealtimeSaleGuardInput,
): RealtimeSaleGuardResult {
  if (input.status === "dead") {
    return { ok: false, code: "dead", message: "Dead leads cannot be sent" };
  }
  if (input.status === "review") {
    return {
      ok: false,
      code: "review",
      message: "Leads in review cannot be sent until a category is assigned",
    };
  }
  if (input.alreadySoldToPartner) {
    return {
      ok: false,
      code: "already_sold",
      message: "This partner already received this lead",
    };
  }
  const remaining = remainingRealtimeResales(
    input.soldCount,
    input.maxRealtimeSells,
  );
  if (remaining <= 0) {
    return {
      ok: false,
      code: "sale_cap",
      message: `This lead has no remaining resales (${input.soldCount} of ${input.maxRealtimeSells} used)`,
    };
  }
  if (!input.leadType || input.categoryResolution !== "matched") {
    return {
      ok: false,
      code: "unclassified",
      message: "Lead has no matched category",
    };
  }
  return { ok: true };
}
