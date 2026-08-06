import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  adminDashboardNeedsServerRefetch,
  parseAdminDashboardPeriod,
  resolveAdminDashboardLookbackWindow,
  resolveAdminDashboardReceivedAtRange,
} from "@/lib/admin/admin-date-period";
import { fetchAdminDashboardRawData } from "@/lib/admin/dashboard-stats";

/**
 * GET /api/admin/dashboard?period=&from=&to=
 * Returns raw dashboard payload for the requested period.
 * Used when All time or a custom range extends beyond the SSR 90-day window.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const search = {
    period: sp.get("period") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };

  const parsed = parseAdminDashboardPeriod(search);
  const range = resolveAdminDashboardReceivedAtRange({
    period: parsed.datePeriod,
    from: parsed.from,
    to: parsed.to,
  });
  const lookback = resolveAdminDashboardLookbackWindow();

  const needsExtended = adminDashboardNeedsServerRefetch(
    parsed.datePeriod,
    parsed.from,
    lookback.gte.toISOString(),
  );

  const raw = needsExtended
    ? await fetchAdminDashboardRawData({
        range: { gte: range.gte, lte: range.lte },
      })
    : await fetchAdminDashboardRawData();

  return NextResponse.json(raw);
}
