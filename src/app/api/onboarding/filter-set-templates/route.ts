import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listFilterSetTemplates,
  serializeTemplatePickerItemForPartner,
} from "@/lib/filter-sets/templates";

/**
 * Public-ish endpoint for fetching filter set templates during onboarding.
 * Only requires a valid Clerk session — no partner record needed yet.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const templates = await listFilterSetTemplates();
  return NextResponse.json(templates.map(serializeTemplatePickerItemForPartner));
}
