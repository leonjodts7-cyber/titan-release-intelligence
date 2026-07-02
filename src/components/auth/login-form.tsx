"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { FloatingInput } from "@/components/auth/floating-input";
import { authCallbackUrl, sanitizeReturnTo } from "@/lib/auth/redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"email" | "password" | "">("");
  const [shake, setShake] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");

  const triggerError = (message: string, field: "email" | "password" | "" = "") => {
    setError(message);
    setFieldError(field);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldError("");

    if (!email.trim()) {
      triggerError("Vul je e-mailadres in.", "email");
      return;
    }
    if (!password) {
      triggerError("Vul je wachtwoord in.", "password");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      triggerError("Onjuist e-mailadres of wachtwoord.");
      return;
    }

    router.push(returnTo);
    router.refresh();
  };

  const handleMagicLink = async () => {
    setError("");
    setFieldError("");

    if (!email.trim()) {
      triggerError("Vul je e-mailadres in voor de inloglink.", "email");
      return;
    }

    setMagicLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: authCallbackUrl(returnTo, origin),
      },
    });
    setMagicLoading(false);

    if (otpError) {
      triggerError("Kon inloglink niet versturen. Probeer het opnieuw.");
      return;
    }

    setMagicEmail(email.trim());
    setMagicSent(true);
  };

  if (magicSent) {
    return (
      <AuthShell>
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-titan-accent/10 border border-titan-accent/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-titan-accent" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">Check je inbox</h1>
          <p className="text-sm text-titan-muted leading-relaxed">
            We stuurden een inloglink naar{" "}
            <span className="text-zinc-300 font-medium">{magicEmail}</span>
          </p>
          <button
            type="button"
            onClick={() => setMagicSent(false)}
            className="text-sm text-titan-accent hover:text-indigo-400 transition-colors"
          >
            Terug naar inloggen
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell shake={shake}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Welkom terug</h1>
        <p className="text-sm text-titan-muted mt-1">Log in op je TITAN intelligence dashboard</p>
      </div>

      <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
        <FloatingInput
          label="E-mailadres"
          type="email"
          value={email}
          onChange={setEmail}
          autoFocus
          autoComplete="email"
          error={fieldError === "email" ? error : undefined}
        />
        <FloatingInput
          label="Wachtwoord"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          showToggle
          toggled={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          error={fieldError === "password" ? error : fieldError === "" ? error || undefined : undefined}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-titan-accent hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Inloggen
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-titan-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-titan-surface px-2 text-titan-muted">of</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={magicLoading || loading}
        className="w-full py-2.5 border border-titan-border hover:border-titan-accent/40 hover:bg-white/[0.02] disabled:opacity-60 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {magicLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Stuur me een inloglink
      </button>

      {/* Google OAuth — prepared, not active */}
      <button
        type="button"
        disabled
        title="Binnenkort beschikbaar"
        className="w-full mt-3 py-2.5 border border-titan-border/50 rounded-lg text-sm text-zinc-600 cursor-not-allowed opacity-50"
      >
        Doorgaan met Google
      </button>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-titan-muted">
        <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="hover:text-titan-accent transition-colors">
          Nog geen account? Registreren
        </Link>
        <Link href="/forgot-password" className="hover:text-titan-accent transition-colors">
          Wachtwoord vergeten?
        </Link>
      </div>
    </AuthShell>
  );
}
