import type { NormalizedRelease } from "@/types";

export interface SourceAdapterResult {
  source: string;
  releases: NormalizedRelease[];
  errors: string[];
}

export interface SourceAdapter {
  readonly id: string;
  readonly name: string;
  fetchReleases(): Promise<NormalizedRelease[]>;
}

export interface IngestResult {
  source: string;
  found: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface IngestSummary {
  results: IngestResult[];
  lastIngestAt: string;
}
