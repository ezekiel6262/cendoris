import { proposeMarket } from "@cendoris/markets";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { portfolio, assets } = await request.json();
    if (!portfolio?.allocations?.length || !assets?.length) return NextResponse.json({ error: "Missing portfolio or assets." }, { status: 400 });
    const proposal = await proposeMarket(portfolio, assets);
    return NextResponse.json({ proposal });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Market proposal failed." }, { status: 500 });
  }
}
