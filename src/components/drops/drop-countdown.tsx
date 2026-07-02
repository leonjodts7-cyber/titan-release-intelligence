"use client";

import { cn } from "@/lib/utils";
import { useDropCountdown } from "@/hooks/use-drop-countdown";
import { formatRelative, isWithinHours } from "@/lib/time";
import { getDropMeta } from "@/lib/drop";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";

export function DropCountdown({ release }: { release: EnrichedRelease }) {
  const meta = getDropMeta(release);
  const { live, urgency } = useDropCountdown(meta.dropAt);

  if (!meta.dropAt || !isWithinHours(meta.dropAt, 24)) return null;

  const label = live ?? formatRelative(meta.dropAt);

  return (
    <span
      className={cn(
        "font-mono text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
        urgency === "urgent" && "bg-titan-loss/15 text-titan-loss",
        urgency === "soon" && "bg-titan-warning/15 text-titan-warning",
        urgency === "normal" && "bg-titan-accent/10 text-titan-accent"
      )}
    >
      {label}
    </span>
  );
}
