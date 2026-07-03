import type { Release } from "@/types";
import { generateMockReleases } from "@/lib/data/mock-releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { classifyRelease } from "./taxonomy";
import { isRealisticDropTime } from "@/lib/drop-times";
import { getDropAt } from "@/lib/drop";

export interface ValidationIssue {
  slug: string;
  title: string;
  code: string;
  message: string;
}

const VENUE_PATTERN = /\b(arena|stadium|bernábeu|bernabéu|wembley|tomorrowland)\b/i;

export function validateRelease(release: Release): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { main, sub } = classifyRelease(release);
  const dropAt = getDropAt(release);

  if (release.release_type === "ticket" && main !== "tickets") {
    issues.push({
      slug: release.slug,
      title: release.title,
      code: "ticket_wrong_main",
      message: `Ticket release classified as ${main}/${sub}`,
    });
  }

  if (main === "schoenen") {
    if (release.release_type === "ticket") {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "ticket_in_schoenen",
        message: "Ticket in Schoenen category",
      });
    }
    if (VENUE_PATTERN.test(release.title)) {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "venue_in_schoenen",
        message: "Venue name in Schoenen release",
      });
    }
    if (release.artists?.name) {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "artist_in_schoenen",
        message: `Artist "${release.artists.name}" in Schoenen`,
      });
    }
    if (/\s—\s[A-Za-z].+\([A-Za-z]{3}\s+\d{4}\)/.test(release.title)) {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "concert_pattern_in_schoenen",
        message: "Concert-style title in Schoenen",
      });
    }
  }

  if (main === "tickets") {
    if (!release.city_id && !release.cities?.name && !release.venues?.name) {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "ticket_no_venue",
        message: "Ticket without city/venue",
      });
    }
    if (!release.event_date && release.release_type === "ticket") {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "ticket_no_event_date",
        message: "Ticket without event_date",
      });
    }
  }

  if (main === "kaarten") {
    const hasSaleType =
      release.drop_event_type === "preorder" ||
      release.drop_event_type === "release" ||
      release.sale_type === "preorder" ||
      release.sale_type === "drop";
    if (!hasSaleType) {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "card_no_sale_type",
        message: "Kaarten release without preorder/release type",
      });
    }
  }

  if (dropAt && !isRealisticDropTime(dropAt)) {
    const d = new Date(dropAt);
    const min = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      minute: "numeric",
    }).format(d);
    issues.push({
      slug: release.slug,
      title: release.title,
      code: "unrealistic_drop_time",
      message: `Drop time has unrealistic minutes (:${min})`,
    });
  }

  if (release.main_category && release.sub_category) {
    const inferred = classifyRelease({ ...release, main_category: null, sub_category: null });
    if (release.main_category !== inferred.main || release.sub_category !== inferred.sub) {
      issues.push({
        slug: release.slug,
        title: release.title,
        code: "stored_category_mismatch",
        message: `Stored ${release.main_category}/${release.sub_category} vs inferred ${inferred.main}/${inferred.sub}`,
      });
    }
  }

  return issues;
}

export function validateAllReleases(releases: Release[]): ValidationIssue[] {
  return releases.flatMap(validateRelease);
}

export function validateMockData(): ValidationIssue[] {
  return validateAllReleases(enrichReleases(generateMockReleases()));
}
