"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function DemoModePill() {
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then((d) => setDemoMode(Boolean(d.demoMode)))
      .catch(() => {});
  }, []);

  if (!demoMode) return null;

  return (
    <Link
      href="/dashboard/admin/setup"
      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-400 font-mono shrink-0"
      title="Supabase not configured — showing mock data with estimated resale"
    >
      Demo data
    </Link>
  );
}
