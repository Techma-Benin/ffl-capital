import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import {
  AdjustPartnerCreditsError,
  adjustPartnerCredits,
} from "@/lib/wallet/adjust-partner-credits";

const bodySchema = z
  .object({
    mode: z.enum(["reduce", "zero"]),
    amount: z.number().positive().optional(),
    note: z.string().optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "reduce" && value.amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount is required when reducing credits",
        path: ["amount"],
      });
    }
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

  try {
    const result = await adjustPartnerCredits({
      partnerId: id,
      mode: parsed.data.mode,
      amount: parsed.data.amount,
      note: parsed.data.note,
      adminUser: authResult.user!,
      appOrigin: request.nextUrl.origin,
    });

    return NextResponse.json({
      transactionId: result.transaction.id,
      amount: result.removed,
      newBalance: result.newBalance,
      emailSent: result.emailSent,
      ...(result.emailWarning ? { emailWarning: result.emailWarning } : {}),
    });
  } catch (err) {
    if (err instanceof AdjustPartnerCreditsError) {
      const status = err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
