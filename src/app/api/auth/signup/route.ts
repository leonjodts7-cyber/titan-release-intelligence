import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isEmailAllowedToSignup, INVITE_ONLY_MESSAGE } from "@/lib/auth/signup";
import { authCallbackUrl } from "@/lib/auth/redirect";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const origin = new URL(request.url).origin;

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail en wachtwoord zijn verplicht." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn." }, { status: 400 });
  }

  if (!isEmailAllowedToSignup(email)) {
    return NextResponse.json({ error: INVITE_ONLY_MESSAGE }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Auth is niet geconfigureerd." }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authCallbackUrl("/dashboard", origin),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    user: data.user,
    needsConfirmation: !data.session,
  });
}
