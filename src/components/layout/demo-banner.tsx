"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export function DemoModeBanner() {
  const [demoMode, setDemoMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then((data) => {
        setDemoMode(Boolean(data.demoMode));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || !demoMode) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-yellow-400">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Demo mode — Supabase not configured. Showing mock data with estimated resale.</span>
      </div>
      <Link href="/dashboard/admin/setup" className="text-yellow-400 hover:text-yellow-300 underline shrink-0 text-xs">
        Setup guide
      </Link>
    </div>
  );
}
