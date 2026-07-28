import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import {
  listFilterSetTemplates,
  serializeTemplatePickerItemForPartner,
} from "@/lib/filter-sets/templates";

export async function GET() {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const templates = await listFilterSetTemplates();
  return NextResponse.json(templates.map(serializeTemplatePickerItemForPartner));
}
