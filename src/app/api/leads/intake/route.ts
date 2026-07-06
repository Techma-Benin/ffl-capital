import { NextRequest, NextResponse } from "next/server";
import { processLeadIntake } from "@/lib/intake/process-intake";
import { intakePayloadSchema } from "@/lib/intake/validate-intake";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = intakePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          outcome: "error",
          reason: parsed.error.errors.map((e) => e.message).join("; "),
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    await processLeadIntake(parsed.data);

    // LeadConduit contract: success with empty reason string
    return NextResponse.json(
      {
        outcome: "success",
        reason: "",
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[intake] error:", message);
    return NextResponse.json(
      { outcome: "error", reason: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
