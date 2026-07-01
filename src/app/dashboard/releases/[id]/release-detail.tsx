"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, RefreshCw, Zap, MapPin, Calendar, Clock,
  AlertTriangle, Eye, Radio, TrendingUp, CheckSquare, Square, BarChart3,
} from "lucide-react";
import type { ReleaseUpdate, ReleaseScore } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { cn, formatCountdown, formatDate, formatPrice, priorityColor } from "@/lib/utils";
import { PriceIntel } from "@/components/releases/price-intel";
import { ReleaseCard } from "@/components/releases/release-card";
import { OpportunityBadge } from "@/components/releases/opportunity-badge";
import { releaseIntelligenceService } from "@/services/release-intelligence.service";
import { MiniChart } from "@/components/intelligence/mini-chart";
import { IntelStat } from "@/components/intelligence/intel-stat";

const TABS = ["Overview", "Pricing", "Resale", "AI", "Timeline", "Sources", "Market", "Graphs", "History", "Notes", "Checklist", "Related", "Statistics"] as const;
type Tab = typeof TABS[number];

interface ReleaseDetailProps {
  release: EnrichedRelease;
  similarReleases?: EnrichedRelease[];
}

export function ReleaseDetail({ release, similarReleases = [] }: ReleaseDetailProps) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [rescoring, setRescoring] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scores, setScores] = useState(release);
  const [resale, setResale] = useState(release);
  const [updates, setUpdates] = useState<ReleaseUpdate[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<Partial<ReleaseScore> | null>(null);
  const [sourceReliability, setSourceReliability] = useState<{ name: string; reliability_score: number; last_error: string | null } | null>(null);
  const [watchlisted, setWatchlisted] = useState(false);
  const [watchlistMsg, setWatchlistMsg] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    account: false, payment: false, link: false, presale: false, timezone: false, reminder: false, watchlist: false,
  });

  const displayResale = { ...release, ...resale };
  const intel = releaseIntelligenceService.analyze(displayResale);
  const eventDate = release.release_starts_at ?? release.presale_starts_at;
  const location = [release.cities?.name, release.countries?.name].filter(Boolean).join(", ");

  useEffect(() => {
    fetch(`/api/releases/${release.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.updates?.length) setUpdates(data.updates);
        if (data.scores) setAiAnalysis(data.scores);
        if (data.sourceReliability) setSourceReliability(data.sourceReliability);
      })
      .catch(() => {});
  }, [release.id]);

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/rescore`, { method: "POST" });
      if (res.ok) { const data = await res.json(); setScores({ ...scores, ...data.scores }); setAiAnalysis(data.scores); }
    } finally { setRescoring(false); }
  };

  const handleRecalculateResale = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/resale`, { method: "POST" });
      if (res.ok) { const data = await res.json(); if (data.resale) setResale({ ...resale, ...data.resale }); }
    } finally { setRecalculating(false); }
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: release.id }),
    });
    if (res.ok) { const data = await res.json(); setWatchlisted(true); setWatchlistMsg(data.message); setChecklist((c) => ({ ...c, watchlist: true })); }
  };

  const displayUpdates = updates.length > 0 ? updates : [{
    id: "m1", update_type: "presale_added" as const, summary: "Tracking started", detected_at: new Date(Date.now() - 86400000).toISOString(),
    importance_score: 70, release_id: release.id, old_value: null, new_value: null, source_url: null, notified: false, created_at: "",
  }];

  const analysis = aiAnalysis ?? { short_summary: intel.full_brief, recommended_action: intel.recommended_action, risk_notes: intel.biggest_risks };

  const toggleCheck = (key: string) => setChecklist((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <Link href="/dashboard/releases" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded border", priorityColor(scores.priority_level))}>{scores.priority_level}</span>
            {release.opportunity_action && <OpportunityBadge action={release.opportunity_action} score={release.opportunity_score} />}
            {release.release_categories && <span className="text-xs text-zinc-500">{release.release_categories.name}</span>}
          </div>
          <h1 className="text-2xl font-bold mb-1">{release.title}</h1>
          {location && <div className="flex items-center gap-1 text-zinc-400 text-sm"><MapPin className="w-4 h-4" />{location}</div>}
        </div>
        <div className="p-4 rounded-xl bg-titan-surface border border-titan-border text-center min-w-[140px]">
          <div className="text-3xl font-mono font-bold text-titan-accent">{formatCountdown(eventDate)}</div>
          <div className="text-[10px] text-zinc-500 uppercase">{formatDate(eventDate)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {release.official_url && (
          <a href={release.official_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-titan-accent text-white rounded-lg text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> Official
          </a>
        )}
        <button onClick={handleRescore} disabled={rescoring} className="px-3 py-1.5 border border-titan-border rounded-lg text-xs disabled:opacity-50">
          <RefreshCw className={cn("w-3.5 h-3.5 inline", rescoring && "animate-spin")} /> Rescore
        </button>
        <button onClick={handleRecalculateResale} disabled={recalculating} className="px-3 py-1.5 border border-titan-border rounded-lg text-xs disabled:opacity-50">
          <TrendingUp className="w-3.5 h-3.5 inline" /> Recalc Resale
        </button>
        <button onClick={handleRefresh} disabled={refreshing} className="px-3 py-1.5 border border-titan-border rounded-lg text-xs disabled:opacity-50">Refresh</button>
        <button onClick={handleWatchlist} className={cn("px-3 py-1.5 border rounded-lg text-xs", watchlisted ? "border-green-500/30 text-green-400" : "border-titan-border")}>
          <Eye className="w-3.5 h-3.5 inline" /> Watchlist
        </button>
      </div>
      {watchlistMsg && <div className="mb-3 p-2 rounded-lg bg-green-500/10 text-xs text-green-400">{watchlistMsg}</div>}

      <div className="flex gap-1 overflow-x-auto mb-4 border-b border-titan-border pb-px">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-3 py-1.5 text-xs whitespace-nowrap rounded-t-lg transition-colors",
              tab === t ? "bg-titan-surface text-titan-accent border border-titan-border border-b-0 -mb-px" : "text-zinc-500 hover:text-zinc-300")}>
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {tab === "Overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-titan-surface border border-titan-border">
              <PriceIntel release={displayResale} />
            </div>
            <div className="p-4 rounded-xl bg-titan-surface border border-titan-border grid grid-cols-3 gap-2 text-center text-xs">
              {[
                ["Hype", scores.hype_score], ["Sellout", `${scores.sellout_probability}%`],
                ["Scarcity", release.scarcity_score], ["Risk", release.risk_score],
                ["Liquidity", Math.round(displayResale.market_liquidity_score)], ["Urgency", release.action_urgency],
              ].map(([l, v]) => (
                <div key={String(l)}><div className="font-mono font-bold text-base">{v}</div><div className="text-zinc-500">{l}</div></div>
              ))}
            </div>
            {release.description && <p className="md:col-span-2 text-sm text-zinc-400">{release.description}</p>}
          </div>
        )}

        {tab === "Pricing" && (
          <div className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <PriceIntel release={displayResale} showLabel />
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-zinc-500">Face value / MSRP</dt><dd className="font-mono">{formatPrice(release.price_min, release.price_max, release.currency)}</dd></div>
              {release.msrp && <div><dt className="text-zinc-500">MSRP</dt><dd className="font-mono">${release.msrp}</dd></div>}
              {release.market_price && <div><dt className="text-zinc-500">Market price (Est.)</dt><dd className="font-mono text-green-400">${release.market_price}</dd></div>}
            </dl>
          </div>
        )}

        {tab === "Resale" && (
          <div className="p-4 rounded-xl bg-titan-surface border border-titan-border space-y-3">
            <PriceIntel release={displayResale} />
            <p className="text-xs text-zinc-400 border-t border-titan-border pt-3">{displayResale.resale_explanation}</p>
            <div className="text-[10px] text-yellow-500/80">All figures labeled Estimated — not financial advice.</div>
          </div>
        )}

        {tab === "AI" && (
          <div className="intel-card space-y-3 text-sm">
            <p className="text-zinc-300">{intel.full_brief}</p>
            <div className="p-3 rounded-lg bg-titan-bg border border-titan-border text-xs space-y-2">
              <div><span className="text-zinc-500">Why ranked:</span> {intel.why_ranked}</div>
              <div><span className="text-zinc-500">Changed:</span> {intel.factors_changed}</div>
              <div><span className="text-zinc-500">Sources:</span> {intel.official_sources_confirmed}</div>
              <div><span className="text-zinc-500">Historical:</span> {intel.historical_context}</div>
              <div><span className="text-zinc-500">Outlook:</span> {intel.market_outlook}</div>
              <div><span className="text-zinc-500">Confidence:</span> {intel.confidence_explanation}</div>
              <div><span className="text-zinc-500">Watch:</span> {intel.developments_to_watch}</div>
            </div>
            <div className="flex items-start gap-2 text-yellow-500/80 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" />{intel.biggest_risks}</div>
            <div className="p-3 rounded-lg bg-titan-accent/10 border border-titan-accent/20 text-xs"><Zap className="w-4 h-4 inline mr-1" />{intel.recommended_action}</div>
          </div>
        )}

        {tab === "Sources" && (
          <div className="intel-card text-xs space-y-2">
            {displayResale.official_sources?.map((s) => (
              <div key={s} className="flex justify-between py-1 border-b border-titan-border/40">
                <span>{s}</span><span className="text-emerald-400">Verified</span>
              </div>
            ))}
            {sourceReliability && <div className="pt-2 text-zinc-500">Scanner: {sourceReliability.name} · {sourceReliability.reliability_score}% reliability</div>}
          </div>
        )}

        {tab === "Graphs" && (
          <div className="space-y-3">
            {[
              ["30 Day", displayResale.price_history_30d],
              ["90 Day", displayResale.price_history_90d],
              ["180 Day", displayResale.price_history_180d],
            ].map(([label, data]) => (
              <div key={String(label)} className="intel-card">
                <div className="intel-section-title mb-2">{label}</div>
                <MiniChart data={data as number[]} height={56} positive={displayResale.price_direction === "UP"} />
              </div>
            ))}
          </div>
        )}

        {tab === "History" && (
          <div className="intel-card text-xs space-y-2">
            <div className="flex justify-between"><span className="text-zinc-500">Historical ROI</span><span className="font-mono text-emerald-400">{displayResale.historical_roi_pct}%</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Price change</span><span className="font-mono">{displayResale.historical_price_change_pct}%</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Sellout time</span><span className="font-mono">{displayResale.historical_sellout_minutes ?? "—"} min</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Attendance</span><span className="font-mono">{displayResale.historical_attendance_pct ?? "—"}%</span></div>
          </div>
        )}

        {tab === "Notes" && (
          <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Internal intelligence notes..."
            className="w-full p-3 bg-titan-bg border border-titan-border rounded-lg text-sm h-32 focus:outline-none focus:border-titan-accent" />
        )}

        {tab === "Statistics" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <IntelStat label="Popularity" value={displayResale.popularity_score} />
            <IntelStat label="Google Trends" value={displayResale.google_trends_score} />
            <IntelStat label="News" value={displayResale.news_activity_score} />
            <IntelStat label="Social" value={displayResale.social_activity_score} />
            <IntelStat label="Momentum" value={displayResale.momentum_score} />
            <IntelStat label="Volatility" value={displayResale.volatility_score} />
            <IntelStat label="AI Confidence" value={`${displayResale.ai_confidence}%`} />
            <IntelStat label="Queue" value={displayResale.expected_queue_difficulty} />
            <IntelStat label="Sellout ETA" value={displayResale.expected_sellout_hours ? `${displayResale.expected_sellout_hours}h` : "—"} />
            <IntelStat label="Countries" value={displayResale.countries_interested?.join(", ") ?? "—"} />
          </div>
        )}

        {tab === "Market" && (
          <div className="p-4 rounded-xl bg-titan-surface border border-titan-border text-xs space-y-2">
            {release.tcg_name && <div className="flex justify-between"><span className="text-zinc-500">TCG</span><span>{release.tcg_name} · {release.set_name}</span></div>}
            {release.capacity_estimate && <div className="flex justify-between"><span className="text-zinc-500">Capacity</span><span className="font-mono">{release.capacity_estimate.toLocaleString()}</span></div>}
            {release.stock_estimate && <div className="flex justify-between"><span className="text-zinc-500">Stock est.</span><span className="font-mono">{release.stock_estimate.toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-zinc-500">Liquidity</span><span className="font-mono">{Math.round(displayResale.market_liquidity_score)}%</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Confidence</span><span className="font-mono">{Math.round(displayResale.resale_confidence_score)}% (Estimated)</span></div>
          </div>
        )}

        {tab === "Timeline" && (
          <div className="p-4 rounded-xl bg-titan-surface border border-titan-border space-y-3">
            {displayUpdates.map((u) => (
              <div key={u.id} className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-titan-accent mt-1 shrink-0" />
                <div><div className="text-zinc-300">{u.summary}</div><div className="text-zinc-600">{formatDate(u.detected_at)}</div></div>
              </div>
            ))}
          </div>
        )}

        {tab === "Checklist" && (
          <div className="p-4 rounded-xl bg-titan-surface border border-titan-border space-y-2">
            <p className="text-xs text-zinc-500 mb-3">Manual prep checklist — no automated checkout.</p>
            {[
              ["account", "Official platform account ready"],
              ["payment", "Payment method verified"],
              ["link", "Official link saved"],
              ["presale", "Presale code/eligibility checked"],
              ["timezone", "Timezone & drop time confirmed"],
              ["reminder", "Calendar reminder set"],
              ["watchlist", "Watchlist active"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => toggleCheck(key)}
                className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/5 text-xs text-left">
                {checklist[key] ? <CheckSquare className="w-4 h-4 text-green-400" /> : <Square className="w-4 h-4 text-zinc-500" />}
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === "Related" && (
          <div className="space-y-2">
            {similarReleases.length > 0 ? similarReleases.map((r) => <ReleaseCard key={r.id} release={r} compact />) : (
              <p className="text-xs text-zinc-500">No related releases</p>
            )}
          </div>
        )}
      </div>

      {sourceReliability && tab === "Overview" && (
        <div className="mt-4 p-3 rounded-lg bg-titan-surface border border-titan-border flex items-center gap-3 text-xs">
          <Radio className="w-4 h-4" /> Source: {sourceReliability.name} · Reliability {sourceReliability.reliability_score}%
        </div>
      )}
    </div>
  );
}
