/** Single source of truth for TITAN design tokens (Tailwind + CSS vars). */
export const titanTokens = {
  bg: "#0a0a0f",
  surface: "#12121a",
  surfaceRaised: "#14141f",
  border: "#1e1e2e",
  accent: "#6366f1",
  muted: "#71717a",
  profit: "#34d399",
  loss: "#f87171",
  warning: "#fbbf24",
  extreme: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  foreground: "#e4e4e7",
} as const;

export type TitanTokenKey = keyof typeof titanTokens;
