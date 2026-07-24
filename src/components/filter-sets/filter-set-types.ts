import type { FilterCriteria } from "@/lib/matching/types";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";

export type CategoryOption = { type: string; label: string };

export type FilterSetFormVariant = "admin" | "partner" | "template";

export type FilterSetRow = {
  id: string;
  name: string;
  leadType: string;
  filterStates: string[];
  priority: number;
  priceOverride: number | null;
  active: boolean;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  filterCriteria: FilterCriteria;
};

export type FilterSetFormData = {
  name: string;
  leadType: string;
  filterStates: string[];
  priority: number;
  priceOverride: string;
  active: boolean;
  weeklyLimit: string;
  monthlyLimit: string;
  filterCriteria: FilterCriteria;
};

export function emptyForm(defaultStates: string[]): FilterSetFormData {
  return {
    name: "Default",
    leadType: "traditional_iul",
    filterStates: defaultStates.length >= 15 ? [...defaultStates] : [],
    priority: 5,
    priceOverride: "",
    active: true,
    weeklyLimit: "",
    monthlyLimit: "",
    filterCriteria: {},
  };
}

export function toFormData(fs: FilterSetRow): FilterSetFormData {
  return {
    name: fs.name,
    leadType: fs.leadType,
    filterStates: [...fs.filterStates],
    priority: fs.priority,
    priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : "",
    active: fs.active,
    weeklyLimit: fs.weeklyLimit != null ? String(fs.weeklyLimit) : "",
    monthlyLimit: fs.monthlyLimit != null ? String(fs.monthlyLimit) : "",
    filterCriteria: stripAttributionCriteria(fs.filterCriteria ?? {}),
  };
}
