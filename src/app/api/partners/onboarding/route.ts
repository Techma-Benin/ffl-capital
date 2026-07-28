import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { PartnerStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminApprovalRequired } from "@/lib/auth/session";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";

import { findFilterSetTemplate } from "@/lib/filter-sets/templates";

const filterCriteriaSchema = z
  .object({
    intent: z.array(z.string()).optional(),
    haveIul: z.array(z.string()).optional(),
    ageMin: z.number().int().min(0).optional(),
    ageMax: z.number().int().min(0).optional(),
    acceptDays: z.array(z.string()).optional(),
    acceptHoursStart: z.number().int().min(0).max(23).optional(),
    acceptHoursEnd: z.number().int().min(0).max(23).optional(),
  })
  .optional();

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  affiliation: z.string().min(1),
  residenceState: z.string().length(2),
  leadType: z.string().min(1),
  filterStates: z.array(z.string().length(2)).min(15),
  templateId: z.string().uuid().optional(),
  filterCriteria: filterCriteriaSchema,
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const existing = await prisma.partner.findFirst({
    where: { OR: [{ clerkUserId: userId }, { email }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Profile already exists" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join("; ") },
      { status: 400 },
    );
  }

  const approvalRequired = isAdminApprovalRequired();
  const status = approvalRequired
    ? PartnerStatus.pending_approval
    : PartnerStatus.active;

  let weeklyLimit: number | null = null;
  let monthlyLimit: number | null = null;
  if (parsed.data.templateId) {
    const template = await findFilterSetTemplate(parsed.data.templateId);
    if (template) {
      weeklyLimit = template.weeklyLimit;
      monthlyLimit = template.monthlyLimit;
    }
  }

  const partner = await prisma.partner.create({
    data: {
      clerkUserId: userId,
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      affiliation: parsed.data.affiliation,
      residenceState: parsed.data.residenceState.toUpperCase(),
      filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()),
      status,
      filterSets: {
        create: {
          name: "Default",
          leadType: parsed.data.leadType,
          filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()),
          weeklyLimit,
          monthlyLimit,
          filterCriteria: stripAttributionCriteria(
            parsed.data.filterCriteria ?? {},
          ),
          // Always start active so hasEligibleFilterSet is true from day one.
          // The matching engine gates on partner.status separately, so this is
          // safe for pending_approval partners — they won't receive leads until
          // an admin approves them. If an admin rejects/disables the partner,
          // syncFilterSetsActiveWithPartnerStatus will deactivate all sets.
          active: true,
        },
      },
    },
  });

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  });
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { partnerId: partner.id },
  });

  return NextResponse.json({ partnerId: partner.id, status: partner.status });
}
