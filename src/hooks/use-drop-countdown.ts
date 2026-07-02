"use client";

import { useEffect, useState } from "react";
import { formatCountdownLive, countdownUrgency, type CountdownUrgency } from "@/lib/time";

export function useDropCountdown(dropAt: string | null): {
  live: string | null;
  urgency: CountdownUrgency;
} {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!dropAt) return;
    const diff = new Date(dropAt).getTime() - Date.now();
    if (diff <= 0 || diff > 24 * 3600_000) return;

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [dropAt]);

  return {
    live: formatCountdownLive(dropAt, now),
    urgency: countdownUrgency(dropAt, now),
  };
}
