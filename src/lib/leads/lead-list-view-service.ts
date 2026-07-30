import { z } from "zod";
import { LeadListViewScope, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  adminLeadViewFiltersSchema,
  leadViewColumnSchema,
  leadViewSortSchema,
  partnerLeadViewFiltersSchema,
  type LeadViewColumn,
} from "@/lib/leads/list-view-schema";
import {
  defaultAdminColumns,
  defaultPartnerColumns,
  mergeColumnsWithCatalog,
  ADMIN_LEAD_COLUMNS,
  PARTNER_LEAD_COLUMNS,
} from "@/lib/leads/list-view-columns";

export type LeadListViewRecord = {
  id: string;
  scope: LeadListViewScope;
  partnerId: string | null;
  name: string;
  filters: unknown;
  sort: unknown;
  columns: unknown;
  isDefault: boolean;
  createdByClerkUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function validateViewPayload(
  scope: LeadListViewScope,
  filters: unknown,
  sort: unknown,
  columns: unknown,
) {
  const parsedSort = leadViewSortSchema.parse(sort);
  const parsedColumns = zodColumns(columns, scope);
  const parsedFilters =
    scope === LeadListViewScope.admin
      ? adminLeadViewFiltersSchema.parse(filters)
      : partnerLeadViewFiltersSchema.parse(filters);
  return { filters: parsedFilters, sort: parsedSort, columns: parsedColumns };
}

function zodColumns(columns: unknown, scope: LeadListViewScope): LeadViewColumn[] {
  const arr = z.array(leadViewColumnSchema).min(1).parse(columns);
  const catalog =
    scope === LeadListViewScope.admin ? ADMIN_LEAD_COLUMNS : PARTNER_LEAD_COLUMNS;
  return mergeColumnsWithCatalog(catalog, arr);
}

export async function listLeadViews(scope: LeadListViewScope, partnerId?: string) {
  return prisma.leadListView.findMany({
    where:
      scope === LeadListViewScope.admin
        ? { scope: LeadListViewScope.admin, partnerId: null }
        : { scope: LeadListViewScope.partner, partnerId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getLeadViewById(id: string) {
  return prisma.leadListView.findUnique({ where: { id } });
}

export async function getDefaultLeadView(
  scope: LeadListViewScope,
  partnerId?: string,
) {
  return prisma.leadListView.findFirst({
    where:
      scope === LeadListViewScope.admin
        ? { scope: LeadListViewScope.admin, partnerId: null, isDefault: true }
        : { scope: LeadListViewScope.partner, partnerId, isDefault: true },
  });
}

export async function findAdminViewByStatusSlice(
  statusSlice: string,
) {
  const views = await prisma.leadListView.findMany({
    where: { scope: LeadListViewScope.admin, partnerId: null },
  });
  return views.find((v) => {
    const f = adminLeadViewFiltersSchema.safeParse(v.filters);
    return f.success && f.data.statusSlice === statusSlice;
  });
}

export async function createLeadView(
  scope: LeadListViewScope,
  data: {
    name: string;
    filters: unknown;
    sort: unknown;
    columns: unknown;
    isDefault?: boolean;
    partnerId?: string | null;
    createdByClerkUserId?: string | null;
  },
) {
  const { filters, sort, columns } = validateViewPayload(
    scope,
    data.filters,
    data.sort,
    data.columns,
  );

  const partnerId =
    scope === LeadListViewScope.partner ? data.partnerId ?? null : null;
  if (scope === LeadListViewScope.partner && !partnerId) {
    throw new Error("partner_required");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await clearDefault(tx, scope, partnerId);
      }
      return tx.leadListView.create({
        data: {
          scope,
          partnerId,
          name: data.name.trim(),
          filters: filters as Prisma.InputJsonValue,
          sort: sort as Prisma.InputJsonValue,
          columns: columns as Prisma.InputJsonValue,
          isDefault: data.isDefault ?? false,
          createdByClerkUserId: data.createdByClerkUserId ?? null,
        },
      });
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new Error("name_conflict");
    }
    throw e;
  }
}

export async function updateLeadView(
  existing: LeadListViewRecord,
  data: {
    name?: string;
    filters?: unknown;
    sort?: unknown;
    columns?: unknown;
  },
) {
  const filters = data.filters ?? existing.filters;
  const sort = data.sort ?? existing.sort;
  const columns = data.columns ?? existing.columns;
  const validated = validateViewPayload(existing.scope, filters, sort, columns);

  try {
    return await prisma.leadListView.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        filters: validated.filters as Prisma.InputJsonValue,
        sort: validated.sort as Prisma.InputJsonValue,
        columns: validated.columns as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new Error("name_conflict");
    }
    throw e;
  }
}

export async function deleteLeadView(existing: LeadListViewRecord) {
  const where =
    existing.scope === LeadListViewScope.admin
      ? { scope: LeadListViewScope.admin, partnerId: null }
      : { scope: LeadListViewScope.partner, partnerId: existing.partnerId };

  const count = await prisma.leadListView.count({ where });
  if (count <= 1) {
    throw new Error("last_view");
  }

  if (existing.isDefault) {
    throw new Error("delete_default");
  }

  await prisma.leadListView.delete({ where: { id: existing.id } });
  return { deleted: true };
}

export async function setDefaultLeadView(existing: LeadListViewRecord) {
  const partnerId = existing.partnerId;
  return prisma.$transaction(async (tx) => {
    await clearDefault(tx, existing.scope, partnerId);
    return tx.leadListView.update({
      where: { id: existing.id },
      data: { isDefault: true },
    });
  });
}

async function clearDefault(
  tx: Prisma.TransactionClient,
  scope: LeadListViewScope,
  partnerId: string | null,
) {
  await tx.leadListView.updateMany({
    where:
      scope === LeadListViewScope.admin
        ? { scope: LeadListViewScope.admin, partnerId: null, isDefault: true }
        : { scope: LeadListViewScope.partner, partnerId, isDefault: true },
    data: { isDefault: false },
  });
}

export function defaultSortForScope(scope: LeadListViewScope) {
  return scope === LeadListViewScope.admin
    ? { field: "receivedAt", direction: "desc" as const }
    : { field: "deliveredAt", direction: "desc" as const };
}

export function defaultColumnsForScope(scope: LeadListViewScope) {
  return scope === LeadListViewScope.admin
    ? defaultAdminColumns()
    : defaultPartnerColumns();
}

export async function ensurePartnerDefaultView(partnerId: string) {
  const existing = await getDefaultLeadView(LeadListViewScope.partner, partnerId);
  if (existing) return existing;
  return createLeadView(LeadListViewScope.partner, {
    name: "All deliveries",
    filters: {},
    sort: defaultSortForScope(LeadListViewScope.partner),
    columns: defaultColumnsForScope(LeadListViewScope.partner),
    isDefault: true,
    partnerId,
  });
}
