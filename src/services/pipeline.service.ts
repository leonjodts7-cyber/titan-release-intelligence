import type { NormalizedRelease, SourceAdapter } from "@/types";
import { sourceScannerService } from "./source-scanner.service";
import { normalizerService } from "./normalizer.service";
import { enrichmentService } from "./enrichment.service";
import { deduplicationService } from "./deduplication.service";
import { aiScoringService } from "./ai-scoring.service";
import { changeDetectionService } from "./change-detection.service";
import { notificationService } from "./notification.service";
import { calendarService } from "./calendar.service";
import { auditLogService } from "./audit-log.service";
import { watchlistMatcherService } from "./watchlist-matcher.service";
import { getSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resaleIntelligenceService } from "./resale-intelligence.service";
import { slugify } from "@/lib/utils";
import type { Release } from "@/types";

export interface PipelineResult {
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: string[];
  mode?: "live" | "mock";
}

async function writeScanLog(
  supabase: SupabaseClient,
  jobId: string | null,
  sourceAdapterId: string,
  level: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from("scan_logs").insert({
      scan_job_id: jobId,
      source_adapter_id: sourceAdapterId,
      level,
      message,
      metadata: metadata ?? {},
    });
  } catch {
    // continue without log persistence
  }
}

function writeScanLogDemo(sourceAdapterId: string, message: string) {
  console.log(`[TITAN:scan:${sourceAdapterId}] ${message}`);
}

export class PipelineOrchestrator {
  async runScan(sourceAdapter: SourceAdapter): Promise<PipelineResult> {
    const result: PipelineResult = {
      itemsFound: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
    };

    const supabase = getSupabaseClient();
    let jobId: string | null = null;

    if (supabase) {
      try {
        const { data: job } = await supabase
          .from("scan_jobs")
          .insert({
            source_adapter_id: sourceAdapter.id,
            status: "running",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        jobId = job?.id ?? null;
      } catch {
        // Continue without job tracking
      }
    }

    try {
      const { items: rawItems, error, mode } = await sourceScannerService.scanAdapter(sourceAdapter);
      result.mode = mode;
      if (error) result.errors.push(error);

      const normalized = normalizerService.normalizeAll(rawItems);
      const enriched = enrichmentService.enrichAll(normalized);
      result.itemsFound = enriched.length;

      if (!supabase) {
        result.itemsSkipped = enriched.length;
        writeScanLogDemo(sourceAdapter.id, `Demo scan: ${enriched.length} items (${mode})`);
        return result;
      }

      await writeScanLog(supabase, jobId, sourceAdapter.id, error ? "error" : "info",
        error ?? `Scan mode: ${mode}, found ${rawItems.length} items`, { mode });

      const { data: existingReleases } = await supabase
        .from("releases")
        .select("id, slug, title, external_id, *")
        .limit(1000);

      const existing = existingReleases ?? [];
      const { unique, duplicates } = deduplicationService.deduplicateBatch(
        enriched,
        existing.map((r) => ({ id: r.id, slug: r.slug, title: r.title, external_id: r.external_id }))
      );
      result.itemsSkipped = duplicates.length;

      for (const item of unique) {
        const scores = await aiScoringService.score({
          title: item.title,
          description: item.description,
          release_type: item.release_type,
          release_starts_at: item.release_starts_at,
          presale_starts_at: item.presale_starts_at,
          official_url: item.official_url,
          price_min: item.price_min,
          price_max: item.price_max,
          currency: item.currency,
          capacity_estimate: item.capacity_estimate,
        });

        const slug = item.slug ?? slugify(item.title);
        const resale = resaleIntelligenceService.analyze({
          ...item,
          ...scores,
        });
        const { data: created, error: createError } = await supabase
          .from("releases")
          .insert({
            title: item.title,
            slug,
            release_type: item.release_type,
            status: item.status,
            official_url: item.official_url,
            source_url: item.source_url,
            image_url: item.image_url,
            description: item.description,
            announced_at: item.announced_at,
            presale_starts_at: item.presale_starts_at,
            general_sale_starts_at: item.general_sale_starts_at,
            release_starts_at: item.release_starts_at,
            release_ends_at: item.release_ends_at,
            timezone: item.timezone,
            price_min: item.price_min,
            price_max: item.price_max,
            currency: item.currency,
            capacity_estimate: item.capacity_estimate,
            external_id: item.external_id,
            source_adapter_id: sourceAdapter.id,
            hype_score: scores.hype_score,
            demand_score: scores.demand_score,
            urgency_score: scores.urgency_score,
            sellout_probability: scores.sellout_probability,
            resale_interest_score: scores.resale_interest_score,
            confidence_score: scores.confidence_score,
            priority_level: scores.priority_level,
            estimated_resale_low: resale.estimated_resale_low,
            estimated_resale_mid: resale.estimated_resale_mid,
            estimated_resale_high: resale.estimated_resale_high,
            expected_profit_low: resale.expected_profit_low,
            expected_profit_mid: resale.expected_profit_mid,
            expected_profit_high: resale.expected_profit_high,
            expected_roi_low: resale.expected_roi_low,
            expected_roi_mid: resale.expected_roi_mid,
            expected_roi_high: resale.expected_roi_high,
            resale_confidence_score: resale.resale_confidence_score,
            market_liquidity_score: resale.market_liquidity_score,
            demand_pressure_score: resale.demand_pressure_score,
            resale_risk_level: resale.resale_risk_level,
            resale_explanation: resale.resale_explanation,
            resale_is_estimated: true,
            last_checked_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (createError) {
          result.itemsSkipped++;
          continue;
        }

        result.itemsCreated++;

        if (created) {
          await supabase.from("release_scores").insert({
            release_id: created.id,
            ...scores,
            model_version: process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "rule-v1",
          });

          await supabase.from("release_updates").insert({
            release_id: created.id,
            update_type: "new_release",
            new_value: item.title,
            summary: `New release detected: ${item.title}`,
            importance_score: scores.hype_score,
          });

          if (notificationService.shouldNotify(scores.priority_level)) {
            await notificationService.notifyRelease(
              created as Release,
              `New ${scores.priority_level} release detected from ${sourceAdapter.name}`
            );
          }

          await watchlistMatcherService.processRelease(created as Release, "new_release");
          await calendarService.addReleaseEvents(created as Release);
        }
      }

      for (const item of duplicates) {
        const slug = item.slug ?? slugify(item.title);
        const existingRelease = existing.find(
          (e) => e.slug === slug || e.external_id === item.external_id
        );
        if (!existingRelease) continue;

        const changes = changeDetectionService.detectChanges(existingRelease as Release, item);
        if (changes.length === 0) {
          result.itemsSkipped++;
          continue;
        }

        const updates: Record<string, unknown> = { last_checked_at: new Date().toISOString(), last_changed_at: new Date().toISOString() };
        for (const change of changes) {
          updates[change.field] = change.newValue;
        }

        await supabase.from("releases").update(updates).eq("id", existingRelease.id);
        result.itemsUpdated++;

        for (const change of changes) {
          const summary = changeDetectionService.summarizeChange(change);
          await supabase.from("release_updates").insert({
            release_id: existingRelease.id,
            update_type: change.updateType,
            old_value: change.oldValue,
            new_value: change.newValue,
            summary,
            importance_score: change.importance,
          });

          if (change.importance >= 80) {
            const scores = await aiScoringService.score(existingRelease as Release);
            await supabase.from("releases").update({
              hype_score: scores.hype_score,
              demand_score: scores.demand_score,
              urgency_score: scores.urgency_score,
              sellout_probability: scores.sellout_probability,
              priority_level: scores.priority_level,
            }).eq("id", existingRelease.id);

            await notificationService.notifyRelease(
              { ...existingRelease, ...updates } as Release,
              summary
            );
            await watchlistMatcherService.processRelease(
              { ...existingRelease, ...updates } as Release,
              "update"
            );
          }
        }
      }

      await supabase.from("source_adapters").update({
        last_scan_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", sourceAdapter.id);

      if (jobId) {
        await supabase.from("scan_jobs").update({
          status: "completed",
          finished_at: new Date().toISOString(),
          items_found: result.itemsFound,
          items_created: result.itemsCreated,
          items_updated: result.itemsUpdated,
          items_skipped: result.itemsSkipped,
        }).eq("id", jobId);
      }

      await auditLogService.log({
        action: "scan_completed",
        entityType: "source_adapter",
        entityId: sourceAdapter.id,
        newData: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pipeline error";
      result.errors.push(message);

      if (jobId && supabase) {
        await supabase.from("scan_jobs").update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: message,
        }).eq("id", jobId);
      }

      if (supabase) {
        await supabase.from("source_adapters").update({
          last_scan_at: new Date().toISOString(),
          last_error: message,
        }).eq("id", sourceAdapter.id);
      }
    }

    return result;
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
