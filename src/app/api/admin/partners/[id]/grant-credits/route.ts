import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { isSuperAdminFromMetadata } from "@/lib/auth/roles";
import {
  GrantPartnerCreditsError,
  grantPartnerCredits,
} from "@/lib/wallet/grant-partner-credits";

const bodySchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional().default(""),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    const status = authResult.error === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: authResult.error }, { status });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const isSuperAdmin = isSuperAdminFromMetadata(
    authResult.user?.publicMetadata as Record<string, unknown>,
  );

  try {
    const result = await grantPartnerCredits({
      partnerId: id,
      amount: parsed.data.amount,
      note: parsed.data.note,
      adminUser: authResult.user!,
      isSuperAdmin,
    });

    return NextResponse.json({
      transactionId: result.transaction.id,
      amount: result.transaction.amount,
      newBalance: result.newBalance,
      emailSent: result.emailSent,
      ...(result.emailWarning ? { emailWarning: result.emailWarning } : {}),
    });
  } catch (err) {
    if (err instanceof GrantPartnerCreditsError) {
      const status =
        err.code === "not_found"
          ? 404
          : err.code === "inactive"
            ? 400
            : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
