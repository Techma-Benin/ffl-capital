import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { LeadType, PartnerStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminApprovalRequired } from "@/lib/auth/session";

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  affiliation: z.string().min(1),
  residenceState: z.string().length(2),
  leadType: z.enum(["traditional_iul", "high_intent_iul"]),
  filterStates: z.array(z.string().length(2)).min(15),
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

  const partner = await prisma.partner.create({
    data: {
      clerkUserId: userId,
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      affiliation: parsed.data.affiliation,
      residenceState: parsed.data.residenceState.toUpperCase(),
      leadType: parsed.data.leadType as LeadType,
      filterStates: parsed.data.filterStates.map((s) => s.toUpperCase()),
      status,
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
