/** Server-side: auth gate. Default off — set AUTH_ENABLED=true to require login. */
export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === "true";
}

/** Client-side mirror (exposed via next.config env). */
export function isAuthEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}
