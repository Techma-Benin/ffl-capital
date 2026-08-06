import { NextRequest, NextResponse } from "next/server";
import { LeadListViewScope } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { leadViewUpdateSchema } from "@/lib/leads/list-view-schema";
import {
  deleteLeadView,
  getLeadViewById,
  setDefaultLeadView,
  updateLeadView,
} from "@/lib/leads/lead-list-view-service";

async function loadAdminView(id: string) {
  const view = await getLeadViewById(id);
  if (!view || view.scope !== LeadListViewScope.admin || view.partnerId !== null) {
    return null;
  }
  return view;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const view = await loadAdminView(id);
  if (!view) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(view);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const existing = await loadAdminView(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = leadViewUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await updateLeadView(existing, parsed.data);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "name_conflict") {
      return NextResponse.json({ error: "Name already in use" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const existing = await loadAdminView(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteLeadView(existing);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "last_view") {
        return NextResponse.json(
          { error: "Cannot delete the only view" },
          { status: 400 },
        );
      }
      if (e.message === "delete_default") {
        return NextResponse.json(
          { error: "Set another view as default before deleting" },
          { status: 400 },
        );
      }
    }
    throw e;
  }
}
