import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  adminDashboardNeedsServerRefetch,
  parseAdminDashboardPeriod,
  resolveLeadViewDateRange,
} from "../../src/lib/admin/admin-date-period";
import {
  buildBuckets,
  chartVolumeLabel,
  resolveChartGranularity,
} from "../../src/lib/admin/dashboard-stats";

describe("admin dashboard date periods", () => {
  test("parses last_month and all_time presets", () => {
    assert.equal(
      parseAdminDashboardPeriod({ period: "last_month" }).datePeriod,
      "last_month",
    );
    assert.equal(
      parseAdminDashboardPeriod({ period: "all_time" }).datePeriod,
      "all_time",
    );
  });

  test("all_time has no lower bound and ends today", () => {
    const now = new Date(2026, 7, 3, 15, 30, 0);
    const range = resolveLeadViewDateRange({ datePeriod: "all_time" }, now);
    assert.ok(range);
    assert.equal(range.gte, undefined);
    assert.equal(range.lte?.getFullYear(), 2026);
    assert.equal(range.lte?.getMonth(), 7);
    assert.equal(range.lte?.getDate(), 3);
    assert.equal(range.lte?.getHours(), 23);
  });

  test("needs server refetch for all_time and long custom", () => {
    const windowStart = new Date(2026, 4, 5).toISOString();
    assert.equal(
      adminDashboardNeedsServerRefetch("all_time", undefined, windowStart),
      true,
    );
    assert.equal(
      adminDashboardNeedsServerRefetch("last_month", undefined, windowStart),
      false,
    );
    assert.equal(
      adminDashboardNeedsServerRefetch("custom", "2026-01-01", windowStart),
      true,
    );
    assert.equal(
      adminDashboardNeedsServerRefetch("custom", "2026-06-01", windowStart),
      false,
    );
  });
});

describe("admin dashboard chart granularity", () => {
  test("maps range length to hour/day/week/month", () => {
    const day = (y: number, m: number, d: number) => new Date(y, m, d, 0, 0, 0);
    const end = (y: number, m: number, d: number) =>
      new Date(y, m, d, 23, 59, 59, 999);

    assert.equal(
      resolveChartGranularity(day(2026, 7, 3), end(2026, 7, 3)),
      "hour",
    );
    // last_7_days / short ranges → daily
    assert.equal(
      resolveChartGranularity(day(2026, 6, 28), end(2026, 7, 3)),
      "day",
    );
    // last_month (~31d) stays daily so progression is visible
    assert.equal(
      resolveChartGranularity(day(2026, 6, 1), end(2026, 6, 31)),
      "day",
    );
    // 60 inclusive days still daily; 61+ → weekly until 90
    assert.equal(
      resolveChartGranularity(day(2026, 5, 5), end(2026, 7, 3)),
      "day",
    );
    assert.equal(
      resolveChartGranularity(day(2026, 5, 4), end(2026, 7, 3)),
      "week",
    );
    assert.equal(
      resolveChartGranularity(day(2026, 4, 6), end(2026, 7, 3)),
      "week",
    );
    assert.equal(
      resolveChartGranularity(day(2025, 0, 1), end(2026, 7, 3)),
      "month",
    );
  });

  test("volume labels match granularity", () => {
    assert.equal(chartVolumeLabel("hour"), "Hourly volume");
    assert.equal(chartVolumeLabel("day"), "Daily volume");
    assert.equal(chartVolumeLabel("week"), "Weekly volume");
    assert.equal(chartVolumeLabel("month"), "Monthly volume");
  });

  test("hourly buckets cover a single day", () => {
    const gte = new Date(2026, 7, 3, 0, 0, 0, 0);
    const lte = new Date(2026, 7, 3, 23, 59, 59, 999);
    const buckets = buildBuckets(gte, lte, "hour");
    assert.equal(buckets.length, 24);
    assert.equal(buckets[0]!.label, "12 AM");
    assert.equal(buckets[13]!.label, "1 PM");
  });

  test("daily buckets for last_month span use single-date labels", () => {
    const gte = new Date(2026, 6, 1, 0, 0, 0, 0);
    const lte = new Date(2026, 6, 31, 23, 59, 59, 999);
    assert.equal(resolveChartGranularity(gte, lte), "day");
    const buckets = buildBuckets(gte, lte, "day");
    assert.equal(buckets.length, 31);
    assert.match(buckets[0]!.label, /1/);
    assert.ok(!buckets[0]!.label.includes("–"));
  });

  test("weekly buckets roll from range start with single-date labels", () => {
    const gte = new Date(2026, 4, 5, 0, 0, 0, 0);
    const lte = new Date(2026, 7, 3, 23, 59, 59, 999);
    const buckets = buildBuckets(gte, lte, "week");
    assert.ok(buckets.length >= 12 && buckets.length <= 14);
    assert.equal(buckets[0]!.label, "May 5");
    assert.equal(buckets[1]!.label, "May 12");
    assert.ok(!buckets.some((b) => b.label.includes("–")));
    // Last window may be partial through range end
    assert.ok(buckets.at(-1)!.end.getTime() > lte.getTime());
  });

  test("empty months still produce zero-capable buckets", () => {
    const gte = new Date(2025, 0, 15, 0, 0, 0, 0);
    const lte = new Date(2025, 2, 10, 23, 59, 59, 999);
    const buckets = buildBuckets(gte, lte, "month");
    assert.equal(buckets.length, 3);
    assert.equal(buckets[0]!.label, "Jan 2025");
    assert.equal(buckets[2]!.label, "Mar 2025");
  });
});
