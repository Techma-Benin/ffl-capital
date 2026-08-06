import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { previewLeadRouting } from "@/lib/lead-routing/coordinator";

const previewSchema = z.object({
  ageHours: z.number().nonnegative(),
  liveSold: z.boolean(),
  integrityPosting: z.enum(["none", "pending", "rejected", "sold"]),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await previewLeadRouting(parsed.data);
  return NextResponse.json(result);
}
