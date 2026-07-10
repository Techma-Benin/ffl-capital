import { NextRequest, NextResponse } from "next/server";
import { LeadType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getPartnerId } from "@/lib/partner/session";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function pick(row: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = row[key];
    if (v) return v;
  }
  return null;
}

function normalizeLeadType(value: string, intent?: string | null, source?: string | null): LeadType {
  const combined = [value, intent, source].filter(Boolean).join(" ").toLowerCase();
  if (combined.includes("high")) return LeadType.high_intent_iul;
  return LeadType.traditional_iul;
}

function resolveBoberdooLeadType(row: Record<string, string>): string | null {
  const explicit = pick(row, "boberdoo_lead_type", "lead_type_id");
  if (explicit) return explicit;
  const leadType = row.lead_type;
  if (leadType && /^\d+$/.test(leadType)) return leadType;
  return null;
}

function resolveClassification(row: Record<string, string>): string {
  const leadType = row.lead_type ?? "";
  if (leadType && !/^\d+$/.test(leadType)) return leadType;
  return pick(row, "classification", "intent") ?? "";
}

function mapCsvRowToLead(row: Record<string, string>) {
  const state = (
    pick(row, "state", "state_you_currently_live_in") ?? ""
  ).toUpperCase().slice(0, 2);

  return {
    firstName: pick(row, "first_name", "firstname") ?? "",
    lastName: pick(row, "last_name", "lastname") ?? "",
    email: pick(row, "email") ?? "",
    phone: pick(row, "phone", "primary_phone") ?? "0000000000",
    address: pick(row, "address"),
    city: pick(row, "city"),
    state,
    zip: pick(row, "zip"),
    dob: pick(row, "dob", "date_of_birth"),
    age: pick(row, "age"),
    leadType: normalizeLeadType(
      resolveClassification(row),
      pick(row, "intent"),
      pick(row, "source", "src"),
    ),
    intent: pick(row, "intent"),
    haveIul: pick(row, "have_iul", "haveiul"),
    primaryGoal: pick(row, "primary_goal", "primarygoal"),
    stateYouCurrentlyLiveIn: pick(row, "state_you_currently_live_in")?.toUpperCase().slice(0, 2) ?? null,
    trustedformCertUrl: pick(row, "trustedform_cert_url", "trusted_form_url"),
    tcpaConsent: pick(row, "tcpa_consent"),
    tcpaLanguage: pick(row, "tcpa_language"),
    leadidToken: pick(row, "leadid_token", "leadi_d_token"),
    source: pick(row, "source", "src") ?? "boberdoo_migration",
    landingPage: pick(row, "landing_page"),
    subId: pick(row, "sub_id"),
    pubId: pick(row, "pub_id"),
    boberdooLeadType: resolveBoberdooLeadType(row),
    ipAddress: pick(row, "ip_address"),
    userAgent: pick(row, "user_agent"),
    externalId: pick(row, "external_id", "unique_identifier"),
    receivedAt: row.received_at ? new Date(row.received_at) : new Date(),
    rawPayload: row,
  };
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const createdById = await getPartnerId();

  const job = await prisma.migrationJob.create({
    data: {
      fileName: file.name,
      totalRows: lines.length - 1,
      createdById: createdById ?? undefined,
      status: "running",
    },
  });

  let successRows = 0;
  let errorRows = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });

    try {
      const mapped = mapCsvRowToLead(row);
      if (!mapped.firstName || !mapped.email || !mapped.state) {
        throw new Error("Missing required fields");
      }

      await prisma.lead.create({ data: mapped });
      successRows++;
    } catch (err) {
      errorRows++;
      errors.push(`Row ${i}: ${err instanceof Error ? err.message : "error"}`);
    }
  }

  await prisma.migrationJob.update({
    where: { id: job.id },
    data: {
      status: errorRows === lines.length - 1 ? "failed" : "completed",
      successRows,
      errorRows,
      errorLog: errors.length > 0 ? errors.slice(0, 50) : undefined,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    jobId: job.id,
    successRows,
    errorRows,
  });
}
