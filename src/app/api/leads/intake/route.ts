import { NextRequest, NextResponse } from "next/server";
import { processLeadIntake } from "@/lib/intake/process-intake";
import { intakePayloadSchema } from "@/lib/intake/validate-intake";

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
        { status: 400 },
      );
    }

    await processLeadIntake(parsed.data);

    // LeadConduit contract: success with empty reason string
    return NextResponse.json({
      outcome: "success",
      reason: "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[intake] error:", message);
    return NextResponse.json(
      { outcome: "error", reason: message },
      { status: 500 },
    );
  }
}
