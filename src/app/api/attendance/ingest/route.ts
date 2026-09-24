import { NextRequest, NextResponse } from "next/server";
import { ingestRawPunchesAction } from "@/actions/attendance-actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await ingestRawPunchesAction(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
