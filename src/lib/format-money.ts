/** Shared USD formatting for UI (en-US, 2 decimal places, grouping). */

import { clsx } from "clsx";

export type MoneyInput =
  | number
  | string
  | { toNumber?: () => number }
  | null
  | undefined;

function toMoneyNumber(value: MoneyInput): number {
  if (value == null || value === "") return 0;
  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdPlainFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** e.g. `$1,050.00` */
export function formatUsd(amount: MoneyInput): string {
  return usdFormatter.format(toMoneyNumber(amount));
}

/** e.g. `1,050.00` (no currency symbol) */
export function formatUsdPlain(amount: MoneyInput): string {
  return usdPlainFormatter.format(toMoneyNumber(amount));
}

/** Table cells for Price, Amount, Balance, Wallet, etc. */
export const moneyCellClassName = "text-right tabular-nums";

/** Table header alignment for monetary columns. */
export const moneyHeaderClassName = "text-right";

/** KPI / stat card values when showing currency. */
export const moneyValueClassName = "text-right tabular-nums";

export function moneyCellClass(...extra: (string | false | null | undefined)[]) {
  return clsx(moneyCellClassName, ...extra);
}
