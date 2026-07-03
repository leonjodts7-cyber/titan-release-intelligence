import type { Release } from "@/types";

export type DataOrigin = "mock" | "api" | "curated";

export const VERIFIED_ORIGINS: DataOrigin[] = ["api", "curated"];

export function isVerifiedOrigin(origin: string | null | undefined): boolean {
  return origin === "api" || origin === "curated";
}

export function isVerifiedRelease(release: Release): boolean {
  return isVerifiedOrigin(release.data_origin);
}

/** Live UI may only show api + curated releases. */
export function filterVerifiedReleases<T extends Release>(releases: T[]): T[] {
  return releases.filter(isVerifiedRelease);
}

export function originLabel(release: Release): string | null {
  if (release.data_origin === "api") {
    return release.source_name ?? "Ticketmaster";
  }
  if (release.data_origin === "curated") {
    try {
      const host = release.source_url ? new URL(release.source_url).hostname.replace(/^www\./, "") : null;
      return host ? `Officiële site (${host})` : "Gecureerde bron";
    } catch {
      return "Gecureerde bron";
    }
  }
  return null;
}
