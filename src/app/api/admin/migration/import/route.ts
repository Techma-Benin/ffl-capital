import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getPartnerId } from "@/lib/partner/session";
import {
  isFullMigrationCsv,
  mapCsvRowToLead,
  mapFullMigrationRow,
  normalizeImportedRow,
} from "@/lib/migration/map-csv-row-to-lead";
import { csvToRecords, escapeCsv } from "@/lib/csv";
import {
  IMPORTABLE_LEAD_FIELDS,
  normalizeFieldName,
} from "@/lib/leads/field-catalog";

// ---------------------------------------------------------------------------
// Shared alias dictionary — used both server-side and exported for the UI
// ---------------------------------------------------------------------------

/** Maps canonical lead field names to all CSV aliases that resolve to them */
const FIELD_ALIASES = Object.fromEntries(
  IMPORTABLE_LEAD_FIELDS.map((field) => [field.key, [...field.aliases]]),
);

/** Build a reverse map: alias → fieldName */
function buildReverseAliasMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of [field, ...aliases]) {
      map[normalizeFieldName(alias)] = field;
    }
  }
  return map;
}

const REVERSE_ALIAS_MAP = buildReverseAliasMap();

// Template headers and sample row for download
const TEMPLATE_HEADERS = IMPORTABLE_LEAD_FIELDS.map(
  (field) => field.aliases[0] ?? field.key,
);

const TEMPLATE_SAMPLE_VALUES: Record<string, string> = {
  first_name: "Jane",
  last_name: "Smith",
  email: "jane.smith@example.com",
  phone: "5555550100",
  state: "TX",
  lead_type: "traditional_iul",
  address: "123 Main St",
  city: "Austin",
  zip: "78701",
  dob: "1975-06-15",
  age: "49",
  intent: "retirement",
  have_iul: "no",
  primary_goal: "wealth_building",
  source: "boberdoo_migration",
  received_at: new Date().toISOString().split("T")[0],
};

const TEMPLATE_SAMPLE_ROW = TEMPLATE_HEADERS.map(
  (header) => TEMPLATE_SAMPLE_VALUES[header] ?? "",
);

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

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
    if (fieldName === "skip" || !fieldName) {
      if (!REVERSE_ALIAS_MAP[normalizeFieldName(csvHeader)]) remapped[csvHeader] = rawRow[csvHeader] ?? "";
      continue;
    }
    // Use the first alias of the field as the canonical key
    const aliases = FIELD_ALIASES[fieldName];
    if (!aliases) continue;
    const canonicalKey = aliases?.[0] ?? fieldName;
    const value = rawRow[csvHeader] ?? "";
    if (value !== undefined) {
      remapped[canonicalKey] = value;
    }
  }

  // Also carry over any unmapped columns via reverse alias lookup
  for (const [csvHeader, value] of Object.entries(rawRow)) {
    if (columnMapping[csvHeader]) continue;
    const fieldName = REVERSE_ALIAS_MAP[normalizeFieldName(csvHeader)];
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
    escapeCsv(v),
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
  const records = csvToRecords(text);
  if (records.length === 0) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  const createdById = await getPartnerId();
  const fullMigration = isFullMigrationCsv(Object.keys(records[0]));

  const categories = await prisma.leadCategory.findMany({
    where: { enabled: true },
    select: {
      type: true,
      label: true,
      enabled: true,
      criteria: { select: { field: true, value: true } },
    },
  });

  const job = await prisma.migrationJob.create({
    data: {
      fileName: file.name,
      totalRows: records.length,
      createdById: createdById ?? undefined,
      status: "running",
    },
  });

  let successRows = 0;
  let errorRows = 0;
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenExternalIds = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    let row = fullMigration
      ? Object.fromEntries(
          Object.entries(records[i]).map(([key, value]) => [normalizeFieldName(key), value]),
        )
      : Object.fromEntries(
      Object.entries(records[i]).map(([key, value]) => [
        key.toLowerCase().replace(/\s+/g, "_"),
        value,
      ]),
    );

    // Apply column mapping if provided
    if (columnMapping && !fullMigration) {
      row = applyColumnMapping(row, columnMapping);
    }
    if (!fullMigration) row = normalizeImportedRow(row);

    try {
      if (fullMigration) {
        const mapped = mapFullMigrationRow(row, categories);
        if (!mapped.firstName || !mapped.email || !mapped.state) {
          throw new Error("Missing required fields");
        }
        const externalId = mapped.externalId;
        if (mapped.id) {
          if (seenIds.has(mapped.id)) throw new Error(`Duplicate ID ${mapped.id} in CSV`);
          const existingById = await prisma.lead.findUnique({
            where: { id: mapped.id },
            select: { id: true },
          });
          if (existingById) throw new Error(`ID conflict: ${mapped.id} already exists`);
          seenIds.add(mapped.id);
        }
        if (externalId) {
          if (seenExternalIds.has(externalId)) {
            throw new Error(`Duplicate external ID ${externalId} in CSV`);
          }
          const existingByExternalId = await prisma.lead.findFirst({
            where: { externalId },
            select: { id: true },
          });
          if (existingByExternalId) {
            throw new Error(`External ID conflict: ${externalId} already exists`);
          }
          seenExternalIds.add(externalId);
        }
        await prisma.lead.create({
          data: {
            ...mapped,
            ...(mapped.rawPayload === null
              ? { rawPayload: Prisma.JsonNull }
              : { rawPayload: mapped.rawPayload as Prisma.InputJsonValue }),
          },
        });
      } else {
        const mapped = mapCsvRowToLead(row, categories);
        if (!mapped.firstName || !mapped.email || !mapped.state) {
          throw new Error("Missing required fields");
        }
        await prisma.lead.create({ data: mapped });
      }
      successRows++;
    } catch (err) {
      errorRows++;
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "error"}`);
    }
  }

  await prisma.migrationJob.update({
    where: { id: job.id },
    data: {
      status: errorRows === records.length ? "failed" : "completed",
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
