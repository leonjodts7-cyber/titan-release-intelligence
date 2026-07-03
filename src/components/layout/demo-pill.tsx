"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HealthResponse {
  mode: "live" | "demo";
}

export function DemoModePill() {
  const [mode, setMode] = useState<"live" | "demo" | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: HealthResponse) => setMode(d.mode === "live" ? "live" : "demo"))
      .catch(() => setMode("demo"));
  }, []);

  if (mode !== "demo") return null;

  return (
    <Link
      href="/dashboard/systeem"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-[10px] text-amber-300 font-mono shrink-0"
      title="Geen live database — mockdata actief"
    >
      Demo data
    </Link>
  );
}
