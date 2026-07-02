import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "auth_callback_failed");
      loginUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}
