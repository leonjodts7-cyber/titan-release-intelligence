"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, RefreshCw, Zap, MapPin,
  Calendar, DollarSign, Clock, AlertTriangle,
} from "lucide-react";
import type { Release } from "@/types";
import { cn, formatCountdown, formatDate, formatPrice, priorityColor } from "@/lib/utils";

const MOCK_UPDATES = [
  { id: "1", update_type: "presale_added", summary: "Presale date announced", detected_at: new Date(Date.now() - 86400000).toISOString(), importance_score: 85 },
  { id: "2", update_type: "official_link_added", summary: "Official link now live", detected_at: new Date(Date.now() - 172800000).toISOString(), importance_score: 75 },
];

const MOCK_SCORE = {
  short_summary: "High-demand release with strong sellout probability based on category, artist popularity, and venue capacity.",
  recommended_action: "Set alerts immediately. Prepare accounts on official platform. Monitor for presale announcements.",
  risk_notes: "High bot activity expected. Use only official sources for purchases.",
};

export function ReleaseDetail({ release }: { release: Release }) {
  const [rescoring, setRescoring] = useState(false);
  const [scores, setScores] = useState(release);

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/rescore`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScores({ ...scores, ...data.scores });
      }
    } finally {
      setRescoring(false);
    }
  };

  const location = [release.cities?.name, release.countries?.name].filter(Boolean).join(", ");
  const eventDate = release.release_starts_at ?? release.presale_starts_at;

  return (
    <div className="p-6 max-w-5xl">
      <Link href="/dashboard/releases" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to releases
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn("text-xs px-2 py-0.5 rounded border", priorityColor(scores.priority_level))}>
              {scores.priority_level}
            </span>
            {release.release_categories && (
              <span className="text-xs text-zinc-500">{release.release_categories.name}</span>
            )}
            <span className="text-xs text-zinc-600 capitalize">{release.status}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{release.title}</h1>
          {location && (
            <div className="flex items-center gap-1 text-zinc-400 text-sm">
              <MapPin className="w-4 h-4" />
              {location}
              {release.venues && ` · ${release.venues.name}`}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-titan-surface border border-titan-border min-w-[180px]">
          <div className="text-4xl font-mono font-bold text-titan-accent">
            {formatCountdown(eventDate)}
          </div>
          <div className="text-xs text-zinc-500 uppercase mt-1">Countdown</div>
          <div className="text-sm text-zinc-400 mt-2">{formatDate(eventDate)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Hype", value: scores.hype_score },
          { label: "Demand", value: scores.demand_score },
          { label: "Urgency", value: scores.urgency_score },
          { label: "Sellout", value: scores.sellout_probability, suffix: "%" },
          { label: "Resale", value: scores.resale_interest_score },
          { label: "Confidence", value: scores.confidence_score },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl bg-titan-surface border border-titan-border text-center">
            <div className="text-lg font-mono font-bold">{Math.round(s.value)}{s.suffix ?? ""}</div>
            <div className="text-[10px] text-zinc-500 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {release.official_url && (
          <a
            href={release.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Official Link
          </a>
        )}
        {release.source_url && (
          <a
            href={release.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-titan-border hover:border-zinc-600 rounded-lg text-sm"
          >
            Source
          </a>
        )}
        <button
          onClick={handleRescore}
          disabled={rescoring}
          className="inline-flex items-center gap-2 px-4 py-2 border border-titan-border hover:border-zinc-600 rounded-lg text-sm disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", rescoring && "animate-spin")} />
          Rescore AI
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI Analysis
            </h2>
            <p className="text-sm text-zinc-300 mb-3">{MOCK_SCORE.short_summary}</p>
            <div className="p-3 rounded-lg bg-titan-bg border border-titan-border mb-3">
              <div className="text-xs text-zinc-500 uppercase mb-1">Recommended Action</div>
              <p className="text-sm">{MOCK_SCORE.recommended_action}</p>
            </div>
            <div className="flex items-start gap-2 text-sm text-yellow-500/80">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {MOCK_SCORE.risk_notes}
            </div>
          </section>

          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Details</h2>
            {release.description && (
              <p className="text-sm text-zinc-400 mb-4">{release.description}</p>
            )}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Price</dt>
                <dd>{formatPrice(release.price_min, release.price_max, release.currency)}</dd>
              </div>
              {release.presale_starts_at && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Presale</dt>
                  <dd>{formatDate(release.presale_starts_at)}</dd>
                </div>
              )}
              {release.general_sale_starts_at && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> General Sale</dt>
                  <dd>{formatDate(release.general_sale_starts_at)}</dd>
                </div>
              )}
              {release.capacity_estimate && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Capacity</dt>
                  <dd>{release.capacity_estimate.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Update Timeline</h2>
          <div className="space-y-3">
            {MOCK_UPDATES.map((update) => (
              <div key={update.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-titan-accent mt-1.5 shrink-0" />
                <div>
                  <div className="text-zinc-300">{update.summary}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {formatDate(update.detected_at)} · Importance {update.importance_score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
