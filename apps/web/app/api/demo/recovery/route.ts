import { proposeRecovery } from "@cendoris/automation";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { mandate, assets, initial, auditStartCount } = await request.json();
    if (!mandate || !assets?.length || !initial?.allocations?.length) return NextResponse.json({ error: "Missing mandate, assets, or initial portfolio." }, { status: 400 });
    const result = await proposeRecovery(mandate, assets, initial, auditStartCount ?? 3);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Recovery proposal failed." }, { status: 500 });
  }
}
