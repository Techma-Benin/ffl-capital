const SAFE_RETURN_PREFIXES = ["/admin", "/partner"] as const;

export const ADMIN_FILTER_LIST_PATH = "/admin/settings?tab=filter-sets";

const LEGACY_ADMIN_FILTER_LIST_PATH = "/admin/filter-list";

export function isFilterListReturnPath(path: string): boolean {
  return path === ADMIN_FILTER_LIST_PATH || path === LEGACY_ADMIN_FILTER_LIST_PATH;
}

export function isSafeReturnTo(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  return SAFE_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function adminPartnerFilterSetNewPath(partnerId: string) {
  return `/admin/partners/${partnerId}/filter-sets/new`;
}

export function adminPartnerFilterSetEditPath(
  partnerId: string,
  filterSetId: string,
  returnTo?: string,
) {
  const base = `/admin/partners/${partnerId}/filter-sets/${filterSetId}/edit`;
  if (returnTo && isSafeReturnTo(returnTo)) {
    return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return base;
}

export function adminFilterSetTemplateNewPath() {
  return "/admin/filter-sets/templates/new";
}

export function adminFilterSetTemplateEditPath(templateId: string) {
  return `/admin/filter-sets/templates/${templateId}/edit`;
}

export function partnerFilterSetNewPath() {
  return "/partner/settings/filter-sets/new";
}

export function partnerFilterSetEditPath(filterSetId: string) {
  return `/partner/settings/filter-sets/${filterSetId}/edit`;
}
