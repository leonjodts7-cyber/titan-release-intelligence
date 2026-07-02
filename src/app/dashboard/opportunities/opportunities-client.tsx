"use client";

import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { OpportunitiesTable } from "@/components/opportunities/opportunities-table";

export function OpportunitiesClient({ initialReleases }: { initialReleases: EnrichedRelease[] }) {
  return <OpportunitiesTable initialReleases={initialReleases} />;
}
