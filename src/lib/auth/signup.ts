/** Server-only: invite-only signup when ALLOWED_SIGNUP_EMAILS is set. */
export function isEmailAllowedToSignup(email: string): boolean {
  const allowlist = process.env.ALLOWED_SIGNUP_EMAILS?.trim();
  if (!allowlist) return true;

  const normalized = email.trim().toLowerCase();
  return allowlist
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

export const INVITE_ONLY_MESSAGE = "TITAN is invite-only";
