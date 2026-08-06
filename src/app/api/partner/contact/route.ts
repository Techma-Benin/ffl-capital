import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import { deliverPartnerContact } from "@/lib/partner/contact-delivery";
import { partnerContactSchema } from "@/lib/partner/contact-schema";

export async function POST(request: NextRequest) {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = partnerContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { partner } = authResult;
  const result = await deliverPartnerContact({
    topic: parsed.data.topic,
    message: parsed.data.message,
    customTopic: parsed.data.customTopic,
    partner: {
      id: partner.id,
      email: partner.email,
      firstName: partner.firstName,
      lastName: partner.lastName,
      status: partner.status,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    confirmationSent: result.confirmationSent,
    ...(result.confirmationWarning
      ? { warning: result.confirmationWarning }
      : {}),
  });
}
