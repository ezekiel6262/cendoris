import { opportunities, underwrite } from "@cendoris/credit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ opportunities });
}

export async function POST(request: NextRequest) {
  try {
    const { opportunityId } = await request.json();
    const opportunity = opportunities.find((o) => o.id === opportunityId);
    if (!opportunity) return NextResponse.json({ error: "Unknown opportunity." }, { status: 404 });
    const analysis = await underwrite(opportunity);
    return NextResponse.json({ opportunity, analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Underwriting failed." }, { status: 500 });
  }
}
