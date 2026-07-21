import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getPartnerId } from "@/lib/partner/session";

// ---------------------------------------------------------------------------
// Shared alias dictionary — used both server-side and exported for the UI
// ---------------------------------------------------------------------------

/** Maps canonical lead field names to all CSV aliases that resolve to them */
const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ["first_name", "firstname"],
  lastName: ["last_name", "lastname"],
  email: ["email"],
  phone: ["phone", "primary_phone"],
  address: ["address"],
  city: ["city"],
  state: ["state", "state_you_currently_live_in"],
  zip: ["zip"],
  dob: ["dob", "date_of_birth"],
  age: ["age"],
  leadType: ["lead_type", "classification"],
  intent: ["intent"],
  haveIul: ["have_iul", "haveiul"],
  primaryGoal: ["primary_goal", "primarygoal"],
  stateYouCurrentlyLiveIn: ["state_you_currently_live_in"],
  trustedformCertUrl: ["trustedform_cert_url", "trusted_form_url"],
  tcpaConsent: ["tcpa_consent"],
  tcpaLanguage: ["tcpa_language"],
  leadidToken: ["leadid_token", "leadi_d_token"],
  source: ["source", "src"],
  landingPage: ["landing_page"],
  subId: ["sub_id"],
  pubId: ["pub_id"],
  boberdooLeadType: ["boberdoo_lead_type", "lead_type_id"],
  ipAddress: ["ip_address"],
  userAgent: ["user_agent"],
  externalId: ["external_id", "unique_identifier"],
  receivedAt: ["received_at"],
};

/** Build a reverse map: alias → fieldName */
function buildReverseAliasMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      map[alias] = field;
    }
  }
  return map;
}

const REVERSE_ALIAS_MAP = buildReverseAliasMap();

// Template headers and sample row for download
const TEMPLATE_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "state",
  "lead_type",
  "address",
  "city",
  "zip",
  "dob",
  "age",
  "intent",
  "have_iul",
  "primary_goal",
  "trustedform_cert_url",
  "tcpa_consent",
  "source",
  "received_at",
];

const TEMPLATE_SAMPLE_ROW = [
  "Jane",
  "Smith",
  "jane.smith@example.com",
  "5555550100",
  "TX",
  "traditional_iul",
  "123 Main St",
  "Austin",
  "78701",
  "1975-06-15",
  "49",
  "retirement",
  "no",
  "wealth_building",
  "",
  "yes",
  "boberdoo_migration",
  new Date().toISOString().split("T")[0],
];

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

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

function normalizeLeadType(
  value: string,
  intent?: string | null,
  source?: string | null,
): string {
  const combined = [value, intent, source].filter(Boolean).join(" ").toLowerCase();
  if (combined.includes("high")) return "high_intent_iul";
  return "traditional_iul";
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
  )
    .toUpperCase()
    .slice(0, 2);

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
    stateYouCurrentlyLiveIn:
      pick(row, "state_you_currently_live_in")?.toUpperCase().slice(0, 2) ??
      null,
    trustedformCertUrl: pick(
      row,
      "trustedform_cert_url",
      "trusted_form_url",
    ),
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

/**
 * Apply a columnMapping (csvHeader → fieldName | "skip") to a raw row,
 * returning a new row keyed by the first alias of each target field.
 */
function applyColumnMapping(
  rawRow: Record<string, string>,
  columnMapping: Record<string, string>,
): Record<string, string> {
  const remapped: Record<string, string> = {};

  for (const [csvHeader, fieldName] of Object.entries(columnMapping)) {
    if (fieldName === "skip" || !fieldName) continue;
    // Use the first alias of the field as the canonical key
    const aliases = FIELD_ALIASES[fieldName];
    const canonicalKey = aliases?.[0] ?? fieldName;
    const value = rawRow[csvHeader] ?? "";
    if (value !== undefined) {
      remapped[canonicalKey] = value;
    }
  }

  // Also carry over any unmapped columns via reverse alias lookup
  for (const [csvHeader, value] of Object.entries(rawRow)) {
    if (columnMapping[csvHeader]) continue; // already handled
    const fieldName = REVERSE_ALIAS_MAP[csvHeader];
    if (fieldName) {
      const aliases = FIELD_ALIASES[fieldName];
      const canonicalKey = aliases?.[0] ?? csvHeader;
      if (!remapped[canonicalKey]) {
        remapped[canonicalKey] = value;
      }
    }
  }

  return remapped;
}

// ---------------------------------------------------------------------------
// GET — download CSV template
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const csvRows = [
    TEMPLATE_HEADERS.join(","),
    TEMPLATE_SAMPLE_ROW.map((v) =>
      v.includes(",") ? `"${v}"` : v,
    ).join(","),
  ];

  return new NextResponse(csvRows.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="lead_import_template.csv"',
    },
  });
}

// ---------------------------------------------------------------------------
// POST — import CSV
// ---------------------------------------------------------------------------

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

  // Optional column mapping: JSON string of { csvHeader: fieldName | "skip" }
  let columnMapping: Record<string, string> | null = null;
  const columnMappingRaw = formData.get("columnMapping");
  if (typeof columnMappingRaw === "string") {
    try {
      columnMapping = JSON.parse(columnMappingRaw);
    } catch {
      return NextResponse.json(
        { error: "Invalid columnMapping JSON" },
        { status: 400 },
      );
    }
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  const rawHeaders = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_"),
  );
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
    let row: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });

    // Apply column mapping if provided
    if (columnMapping) {
      row = applyColumnMapping(row, columnMapping);
    }

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
    errors: errors.slice(0, 100),
  });
}
