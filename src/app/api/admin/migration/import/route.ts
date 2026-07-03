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

function normalizeLeadType(value: string): LeadType {
  const v = value.toLowerCase().replace(/\s+/g, "_");
  if (v.includes("high")) return LeadType.high_intent_iul;
  return LeadType.traditional_iul;
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

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
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
      if (!row.first_name || !row.email || !row.state) {
        throw new Error("Missing required fields");
      }

      await prisma.lead.create({
        data: {
          firstName: row.first_name,
          lastName: row.last_name ?? "",
          email: row.email,
          phone: row.phone ?? "0000000000",
          state: row.state.toUpperCase().slice(0, 2),
          leadType: normalizeLeadType(row.lead_type ?? "traditional_iul"),
          receivedAt: row.received_at ? new Date(row.received_at) : new Date(),
          source: "boberdoo_migration",
          rawPayload: row,
        },
      });
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
