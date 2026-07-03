import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Release } from "@/types";
import { isVerifiedRelease, originLabel } from "@/lib/data/origin";
import { t } from "@/lib/i18n";

export function SourceOrigin({ release }: { release: Release }) {
  if (!isVerifiedRelease(release)) return null;

  const label = originLabel(release);
  const url =
    release.data_origin === "curated"
      ? release.source_url
      : release.official_url ?? release.source_url;

  if (!label || !url) return null;

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-titan-muted hover:text-titan-accent transition-colors"
    >
      {t("drops.source", { source: label })}
      <ExternalLink className="w-3 h-3 shrink-0" />
    </Link>
  );
}
