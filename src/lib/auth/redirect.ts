const SAFE_PATH = /^\/(?!\/)[\w\-./]*$/;

export function sanitizeReturnTo(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !SAFE_PATH.test(value) || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

export function authCallbackUrl(returnTo: string, origin: string): string {
  const safe = sanitizeReturnTo(returnTo);
  return `${origin}/auth/callback?returnTo=${encodeURIComponent(safe)}`;
}
