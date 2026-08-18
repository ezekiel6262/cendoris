import { proposeStrategy } from "@cendoris/automation";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    const result = await proposeStrategy(text || undefined);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Strategy compilation failed." }, { status: 500 });
  }
}
