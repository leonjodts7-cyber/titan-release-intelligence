"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface HealthPayload {
  ingest?: { lastAt?: string | null };
}

export function FreshnessIndicator() {
  const [lastAt, setLastAt] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then((d: HealthPayload) => setLastAt(d.ingest?.lastAt ?? null))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!lastAt) return null;

  const ageMin = Math.round((Date.now() - new Date(lastAt).getTime()) / 60_000);
  const fresh = ageMin < 45;

  return (
    <Link
      href="/dashboard/systeem"
      className="hidden md:inline-flex items-center gap-1.5 text-[10px] text-titan-muted font-mono hover:text-titan-accent shrink-0"
      title={t("freshness.title")}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", fresh ? "bg-emerald-400" : "bg-amber-400")} />
      {t("freshness.updated", {
        when: formatDistanceToNow(new Date(lastAt), { addSuffix: true, locale: nl }),
      })}
    </Link>
  );
}
