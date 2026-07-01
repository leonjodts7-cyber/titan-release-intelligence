import { NextRequest, NextResponse } from "next/server";
import { toggleAlertRule } from "@/lib/data/alert-rules";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rule = toggleAlertRule(id);
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json({ rule });
}
