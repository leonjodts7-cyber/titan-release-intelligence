"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { ReleaseFilters } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { sortByRoi } from "@/lib/data/enrich-releases";
import { ReleaseCard } from "@/components/releases/release-card";
import { SearchBar } from "@/components/search/search-bar";

export function ReleasesClient({ initialReleases }: { initialReleases: EnrichedRelease[] }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ReleaseFilters>({
    sort: (searchParams.get("sort") as ReleaseFilters["sort"]) ?? "priority",
    priority: (searchParams.get("priority") as ReleaseFilters["priority"]) ?? undefined,
  });

  useEffect(() => {
    setFilters({
      sort: (searchParams.get("sort") as ReleaseFilters["sort"]) ?? "priority",
      priority: (searchParams.get("priority") as ReleaseFilters["priority"]) ?? undefined,
    });
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = [...initialReleases];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (filters.priority) {
      result = result.filter((r) => r.priority_level === filters.priority);
    }

    switch (filters.sort) {
      case "date":
        result.sort((a, b) => {
          const da = a.release_starts_at ? new Date(a.release_starts_at).getTime() : Infinity;
          const db = b.release_starts_at ? new Date(b.release_starts_at).getTime() : Infinity;
          return da - db;
        });
        break;
      case "hype":
        result.sort((a, b) => b.hype_score - a.hype_score);
        break;
      case "sellout":
        result.sort((a, b) => b.sellout_probability - a.sellout_probability);
        break;
      case "roi":
        result = sortByRoi(result);
        break;
      default: {
        const order = { EXTREME: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        result.sort((a, b) =>
          (order[a.priority_level] ?? 4) - (order[b.priority_level] ?? 4) ||
          b.hype_score - a.hype_score
        );
      }
    }

    return result;
  }, [initialReleases, filters]);

  return (
    <div className="space-y-4">
      <SearchBar onSearch={setFilters} initialFilters={filters} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((r) => <ReleaseCard key={r.id} release={r} />)}
      </div>
      {filtered.length === 0 && (
        <div className="text-center text-zinc-500 py-12">No releases match your filters</div>
      )}
    </div>
  );
}
