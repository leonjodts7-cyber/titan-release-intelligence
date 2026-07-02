"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { FloatingInput } from "@/components/auth/floating-input";
import { sanitizeReturnTo } from "@/lib/auth/redirect";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerError = (message: string) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      triggerError("Vul je e-mailadres in.");
      return;
    }
    if (password.length < 8) {
      triggerError("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (password !== confirm) {
      triggerError("Wachtwoorden komen niet overeen.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      triggerError(data.error ?? "Registratie mislukt.");
      return;
    }

    if (data.needsConfirmation) {
      setSuccess(true);
      return;
    }

    router.push(returnTo);
    router.refresh();
  };

  if (success) {
    return (
      <AuthShell>
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold text-zinc-100">Bevestig je e-mail</h1>
          <p className="text-sm text-titan-muted">
            We stuurden een bevestigingslink naar{" "}
            <span className="text-zinc-300">{email}</span>
          </p>
          <Link href="/login" className="inline-block text-sm text-titan-accent hover:text-indigo-400">
            Terug naar inloggen
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell shake={shake}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Account aanmaken</h1>
        <p className="text-sm text-titan-muted mt-1">Krijg toegang tot TITAN intelligence</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FloatingInput
          label="E-mailadres"
          type="email"
          value={email}
          onChange={setEmail}
          autoFocus
          autoComplete="email"
        />
        <FloatingInput
          label="Wachtwoord"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          showToggle
          toggled={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />
        <FloatingInput
          label="Bevestig wachtwoord"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {error && <p className="text-xs text-titan-loss">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-titan-accent hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Registreren
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-titan-muted">
        Al een account?{" "}
        <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="text-titan-accent hover:text-indigo-400">
          Inloggen
        </Link>
      </p>
    </AuthShell>
  );
}
