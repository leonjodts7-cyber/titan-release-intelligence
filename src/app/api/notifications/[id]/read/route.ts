import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/admin";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  if (supabase) {
    await supabase.from("notifications").update({
      status: "read",
      read_at: new Date().toISOString(),
    }).eq("id", id);
  }

  return NextResponse.json({ id, status: "read" });
}
