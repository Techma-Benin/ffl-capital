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
  return soldCount < maxRealtimeSells;
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
  if (!input.leadType || input.categoryResolution !== "matched") {
    return {
      ok: false,
      code: "unclassified",
      message: "Lead has no matched category",
    };
  }
  if (input.alreadySoldToPartner) {
    return {
      ok: false,
      code: "already_sold",
      message: "This partner already received this lead",
    };
  }
  if (
    !canAcceptAnotherRealtimeSale(input.soldCount, input.maxRealtimeSells)
  ) {
    return {
      ok: false,
      code: "sale_cap",
      message: `This category allows at most ${input.maxRealtimeSells} realtime sale${input.maxRealtimeSells === 1 ? "" : "s"}`,
    };
  }
  return { ok: true };
}
