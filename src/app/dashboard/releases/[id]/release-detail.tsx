"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, RefreshCw, Zap, MapPin,
  Calendar, Clock, AlertTriangle, Eye, Radio, TrendingUp, BarChart3,
} from "lucide-react";
import type { ReleaseUpdate, ReleaseScore } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { cn, formatCountdown, formatDate, formatPrice, priorityColor } from "@/lib/utils";
import { PriceIntel } from "@/components/releases/price-intel";
import { ReleaseCard } from "@/components/releases/release-card";

interface ReleaseDetailProps {
  release: EnrichedRelease;
  similarReleases?: EnrichedRelease[];
}

export function ReleaseDetail({ release, similarReleases = [] }: ReleaseDetailProps) {
  const [rescoring, setRescoring] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scores, setScores] = useState(release);
  const [resale, setResale] = useState(release);
  const [updates, setUpdates] = useState<ReleaseUpdate[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<Partial<ReleaseScore> | null>(null);
  const [sourceReliability, setSourceReliability] = useState<{
    name: string; reliability_score: number; last_error: string | null;
  } | null>(null);
  const [watchlisted, setWatchlisted] = useState(false);
  const [watchlistMsg, setWatchlistMsg] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/releases/${release.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.updates?.length) setUpdates(data.updates);
        if (data.scores) setAiAnalysis(data.scores);
        if (data.sourceReliability) setSourceReliability(data.sourceReliability);
      }
    }
    load();
  }, [release.id]);

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/rescore`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScores({ ...scores, ...data.scores });
        setAiAnalysis(data.scores);
      }
    } finally {
      setRescoring(false);
    }
  };

  const handleRecalculateResale = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/resale`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.resale) setResale({ ...resale, ...data.resale });
      }
    } finally {
      setRecalculating(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await fetch(`/api/releases/${release.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.updates?.length) setUpdates(data.updates);
      if (data.scores) setAiAnalysis(data.scores);
      if (data.sourceReliability) setSourceReliability(data.sourceReliability);
    }
    setRefreshing(false);
  };

  const handleWatchlist = async () => {
    const res = await fetch("/api/watchlists/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: release.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setWatchlisted(true);
      setWatchlistMsg(data.message);
    }
  };

  const location = [release.cities?.name, release.countries?.name].filter(Boolean).join(", ");
  const eventDate = release.release_starts_at ?? release.presale_starts_at;

  const displayUpdates = updates.length > 0 ? updates : [
    { id: "m1", update_type: "presale_added" as const, summary: "Presale date announced", detected_at: new Date(Date.now() - 86400000).toISOString(), importance_score: 85, release_id: release.id, old_value: null, new_value: null, source_url: null, notified: false, created_at: "" },
  ];

  const analysis = aiAnalysis ?? {
    short_summary: `${release.title} classified as ${scores.priority_level} priority.`,
    recommended_action: scores.priority_level === "EXTREME"
      ? "Set alerts immediately. Prepare accounts on official platform."
      : "Add to watchlist and monitor for updates.",
    risk_notes: "Use only official sources for purchases.",
  };

  const displayResale = { ...release, ...resale };

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <Link href="/dashboard/releases" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to releases
      </Link>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded border", priorityColor(scores.priority_level))}>
              {scores.priority_level}
            </span>
            {release.release_categories && (
              <span className="text-xs text-zinc-500">{release.release_categories.name}</span>
            )}
            <span className="text-xs text-zinc-600 capitalize">{release.status}</span>
            {displayResale.resale_risk_level && (
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Resale risk: {displayResale.resale_risk_level}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{release.title}</h1>
          {location && (
            <div className="flex items-center gap-1 text-zinc-400 text-sm">
              <MapPin className="w-4 h-4" />
              {location}
              {release.venues && ` · ${release.venues.name}`}
              {release.venues?.capacity && ` (${release.venues.capacity.toLocaleString()} cap.)`}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-titan-surface border border-titan-border min-w-[160px]">
          <div className="text-3xl font-mono font-bold text-titan-accent">{formatCountdown(eventDate)}</div>
          <div className="text-[10px] text-zinc-500 uppercase mt-1">Countdown</div>
          <div className="text-xs text-zinc-400 mt-1">{formatDate(eventDate)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-6">
        {[
          { label: "Hype", value: scores.hype_score },
          { label: "Demand", value: scores.demand_score },
          { label: "Urgency", value: scores.urgency_score },
          { label: "Sellout", value: scores.sellout_probability, suffix: "%" },
          { label: "Resale", value: scores.resale_interest_score },
          { label: "Confidence", value: scores.confidence_score },
          { label: "Demand pressure", value: displayResale.demand_pressure_score },
        ].map((s) => (
          <div key={s.label} className="p-2 rounded-lg bg-titan-surface border border-titan-border text-center">
            <div className="text-base font-mono font-bold">{Math.round(s.value)}{s.suffix ?? ""}</div>
            <div className="text-[9px] text-zinc-500 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {release.official_url && (
          <a href={release.official_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg text-xs font-medium">
            <ExternalLink className="w-3.5 h-3.5" /> Official Link
          </a>
        )}
        {release.source_url && (
          <a href={release.source_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-titan-border hover:border-zinc-600 rounded-lg text-xs">
            Source
          </a>
        )}
        <button onClick={handleRescore} disabled={rescoring}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-titan-border hover:border-zinc-600 rounded-lg text-xs disabled:opacity-50">
          <RefreshCw className={cn("w-3.5 h-3.5", rescoring && "animate-spin")} /> Rescore AI
        </button>
        <button onClick={handleRecalculateResale} disabled={recalculating}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-titan-border hover:border-zinc-600 rounded-lg text-xs disabled:opacity-50">
          <TrendingUp className={cn("w-3.5 h-3.5", recalculating && "animate-pulse")} /> Recalculate Resale
        </button>
        <button onClick={handleRefresh} disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-titan-border hover:border-zinc-600 rounded-lg text-xs disabled:opacity-50">
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} /> Refresh
        </button>
        <button onClick={handleWatchlist}
          className={cn("inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs",
            watchlisted ? "border-green-500/30 text-green-400" : "border-titan-border hover:border-zinc-600")}>
          <Eye className="w-3.5 h-3.5" /> {watchlisted ? "Watchlisted" : "Add to Watchlist"}
        </button>
      </div>

      {watchlistMsg && (
        <div className="mb-4 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
          {watchlistMsg}
        </div>
      )}

      {sourceReliability && (
        <div className="mb-4 p-3 rounded-lg bg-titan-surface border border-titan-border flex items-center gap-3 text-xs">
          <Radio className="w-4 h-4 text-zinc-500" />
          <span>Source: {sourceReliability.name}</span>
          <span className="text-zinc-500">Reliability {sourceReliability.reliability_score}%</span>
          {sourceReliability.last_error && (
            <span className="text-yellow-500">{sourceReliability.last_error}</span>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Pricing & Resale Intelligence
            </h2>
            <PriceIntel release={displayResale} />
            {displayResale.resale_explanation && (
              <p className="mt-3 text-xs text-zinc-400 border-t border-titan-border pt-3">
                {displayResale.resale_explanation}
              </p>
            )}
          </section>

          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" /> AI Demand Analysis
            </h2>
            <p className="text-sm text-zinc-300 mb-3">{analysis.short_summary}</p>
            <div className="p-3 rounded-lg bg-titan-bg border border-titan-border mb-3">
              <div className="text-[10px] text-zinc-500 uppercase mb-1">Recommended Action</div>
              <p className="text-sm">{analysis.recommended_action}</p>
            </div>
            <div className="flex items-start gap-2 text-sm text-yellow-500/80">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {analysis.risk_notes}
            </div>
          </section>

          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Market Notes</h2>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Face value / Retail</dt>
                <dd className="font-mono">{formatPrice(release.price_min, release.price_max, release.currency)}</dd>
              </div>
              {release.release_type === "ticket" && release.capacity_estimate && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Venue capacity</dt>
                  <dd className="font-mono">{release.capacity_estimate.toLocaleString()}</dd>
                </div>
              )}
              {release.release_type === "product" && release.stock_estimate && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Stock estimate</dt>
                  <dd className="font-mono">{release.stock_estimate.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">Market liquidity</dt>
                <dd className="font-mono">{Math.round(displayResale.market_liquidity_score)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Resale confidence</dt>
                <dd className="font-mono">{Math.round(displayResale.resale_confidence_score)}% (Estimated)</dd>
              </div>
            </dl>
          </section>

          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Details</h2>
            {release.description && <p className="text-sm text-zinc-400 mb-3">{release.description}</p>}
            <dl className="space-y-2 text-xs">
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
            </dl>
          </section>

          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Admin Notes</h2>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add internal notes..."
              className="w-full p-3 bg-titan-bg border border-titan-border rounded-lg text-sm resize-none h-20 focus:outline-none focus:border-titan-accent"
            />
          </section>
        </div>

        <div className="space-y-4">
          <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Update Timeline</h2>
            <div className="space-y-3">
              {displayUpdates.map((update) => (
                <div key={update.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-titan-accent mt-1.5 shrink-0" />
                  <div>
                    <div className="text-zinc-300 text-xs">{update.summary ?? update.update_type}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">
                      {formatDate(update.detected_at)} · Importance {update.importance_score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {similarReleases.length > 0 && (
            <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Similar Releases</h2>
              <div className="space-y-2">
                {similarReleases.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
