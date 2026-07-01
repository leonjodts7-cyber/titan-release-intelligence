"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-titan-accent" />
            <span className="font-bold text-xl">TITAN</span>
          </Link>
          <h1 className="text-2xl font-bold">Sign in to TITAN</h1>
          <p className="text-zinc-500 text-sm mt-2">Access your release intelligence dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-titan-surface border border-titan-border">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-titan-bg border border-titan-border rounded-lg focus:outline-none focus:border-titan-accent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-titan-bg border border-titan-border rounded-lg focus:outline-none focus:border-titan-accent"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
          <p className="text-xs text-zinc-500 text-center">
            Configure Supabase Auth for production. Demo mode redirects to dashboard.
          </p>
        </form>
      </div>
    </div>
  );
}
