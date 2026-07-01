"use client";

import { useEffect, useState } from "react";

/** Compact demo indicator — full banner removed in V2 */
export function DemoModeBanner() {
  return null;
}

export function useDemoMode(): boolean {
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then((d) => setDemoMode(Boolean(d.demoMode)))
      .catch(() => {});
  }, []);
  return demoMode;
}
