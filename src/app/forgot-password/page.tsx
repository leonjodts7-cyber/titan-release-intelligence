"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { FloatingInput } from "@/components/auth/floating-input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Vul je e-mailadres in.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent("/dashboard")}`,
    });
    setLoading(false);

    if (resetError) {
      setError("Kon resetlink niet versturen. Probeer het opnieuw.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell>
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-titan-accent/10 border border-titan-accent/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-titan-accent" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">Check je inbox</h1>
          <p className="text-sm text-titan-muted">
            We stuurden een resetlink naar{" "}
            <span className="text-zinc-300 font-medium">{email}</span>
          </p>
          <Link href="/login" className="text-sm text-titan-accent hover:text-indigo-400">
            Terug naar inloggen
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Wachtwoord vergeten</h1>
        <p className="text-sm text-titan-muted mt-1">We sturen je een link om je wachtwoord te resetten</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FloatingInput
          label="E-mailadres"
          type="email"
          value={email}
          onChange={setEmail}
          autoFocus
          autoComplete="email"
          error={error || undefined}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-titan-accent hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Resetlink versturen
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-titan-muted">
        <Link href="/login" className="text-titan-accent hover:text-indigo-400">
          Terug naar inloggen
        </Link>
      </p>
    </AuthShell>
  );
}
