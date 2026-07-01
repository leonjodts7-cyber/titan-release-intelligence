import type { Release, UpdateType } from "@/types";

interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  updateType: UpdateType;
  importance: number;
}

export class ChangeDetectionService {
  detectChanges(existing: Release, incoming: Partial<Release>): FieldChange[] {
    const changes: FieldChange[] = [];
    const fields: Array<{
      key: keyof Release;
      updateType: UpdateType;
      importance: number;
    }> = [
      { key: "release_starts_at", updateType: "date_changed", importance: 90 },
      { key: "presale_starts_at", updateType: "presale_added", importance: 85 },
      { key: "general_sale_starts_at", updateType: "presale_added", importance: 80 },
      { key: "price_min", updateType: "price_changed", importance: 70 },
      { key: "price_max", updateType: "price_changed", importance: 70 },
      { key: "official_url", updateType: "official_link_added", importance: 75 },
      { key: "status", updateType: "status_changed", importance: 80 },
      { key: "venue_id", updateType: "location_changed", importance: 85 },
    ];

    for (const { key, updateType, importance } of fields) {
      const oldVal = existing[key];
      const newVal = incoming[key];
      if (newVal !== undefined && String(oldVal ?? "") !== String(newVal ?? "")) {
        changes.push({
          field: key,
          oldValue: oldVal != null ? String(oldVal) : null,
          newValue: newVal != null ? String(newVal) : null,
          updateType,
          importance,
        });
      }
    }

    return changes;
  }

  detectImminent(release: Release): FieldChange | null {
    if (!release.release_starts_at) return null;
    const diff = new Date(release.release_starts_at).getTime() - Date.now();
    if (diff > 0 && diff <= 3600000) {
      return {
        field: "release_starts_at",
        oldValue: null,
        newValue: release.release_starts_at,
        updateType: "release_imminent",
        importance: 95,
      };
    }
    if (diff <= 0 && release.status !== "ended" && release.status !== "sold_out") {
      return {
        field: "status",
        oldValue: release.status,
        newValue: "ended",
        updateType: "release_ended",
        importance: 60,
      };
    }
    return null;
  }

  summarizeChange(change: FieldChange): string {
    switch (change.updateType) {
      case "date_changed":
        return `Release date changed from ${change.oldValue ?? "TBA"} to ${change.newValue}`;
      case "presale_added":
        return `Presale/sale date updated to ${change.newValue}`;
      case "price_changed":
        return `Price changed from ${change.oldValue ?? "TBA"} to ${change.newValue}`;
      case "official_link_added":
        return `Official link now available: ${change.newValue}`;
      case "status_changed":
        return `Status changed from ${change.oldValue} to ${change.newValue}`;
      case "location_changed":
        return `Venue/location updated`;
      case "release_imminent":
        return `Release starting within 1 hour`;
      case "release_ended":
        return `Release has ended or passed`;
      default:
        return `${change.field} updated`;
    }
  }
}

export const changeDetectionService = new ChangeDetectionService();
