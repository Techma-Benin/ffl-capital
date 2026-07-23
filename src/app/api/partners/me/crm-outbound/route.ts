import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import {
  crmOutboundConfigBodySchema,
  defaultSuccessRule,
} from "@/lib/crm-outbound/schemas";
import { serializeCrmOutboundConfig } from "@/lib/crm-outbound/serialize";
import {
  OutboundUrlGuardError,
  validateOutboundEndpointUrl,
} from "@/lib/delivery/outbound-url-guard";

export async function GET() {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.partnerCrmOutboundConfig.findUnique({
    where: { partnerId },
  });

  if (!config) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  return NextResponse.json(serializeCrmOutboundConfig(config));
}

export async function PATCH(request: NextRequest) {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = crmOutboundConfigBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join("; ") },
      { status: 400 },
    );
  }

  try {
    await validateOutboundEndpointUrl(parsed.data.endpointUrl);
  } catch (err) {
    const message =
      err instanceof OutboundUrlGuardError ? err.message : "Invalid endpoint URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const successRule = parsed.data.successRule ?? defaultSuccessRule();
  const authConfig = (parsed.data.authConfig ?? {}) as Prisma.InputJsonValue;
  const fieldMappings = parsed.data.fieldMappings as Prisma.InputJsonValue;
  const successRuleJson = successRule as Prisma.InputJsonValue;

  const config = await prisma.partnerCrmOutboundConfig.upsert({
    where: { partnerId },
    create: {
      partnerId,
      enabled: parsed.data.enabled,
      endpointUrl: parsed.data.endpointUrl,
      httpMethod: "POST",
      authType: parsed.data.authType,
      authConfig,
      fieldMappings,
      successRule: successRuleJson,
    },
    update: {
      enabled: parsed.data.enabled,
      endpointUrl: parsed.data.endpointUrl,
      httpMethod: "POST",
      authType: parsed.data.authType,
      authConfig,
      fieldMappings,
      successRule: successRuleJson,
    },
  });

  return NextResponse.json(serializeCrmOutboundConfig(config));
}

export async function DELETE() {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.partnerCrmOutboundConfig.deleteMany({ where: { partnerId } });
  return NextResponse.json({ ok: true });
}
