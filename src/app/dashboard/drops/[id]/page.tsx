import { notFound } from "next/navigation";
import { getReleaseById, getReleases } from "@/lib/data/releases";
import { enrichRelease } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { DropDetailView } from "@/components/drops/drop-detail-view";

export const dynamic = "force-dynamic";

export default async function DropDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getReleaseById(id);
  if (!raw) notFound();

  const release = enrichRelease(raw);
  const all = await getReleases({ includePast: true });
  const related = all
    .filter((r) => r.id !== id && r.release_categories?.slug === raw.release_categories?.slug)
    .slice(0, 4)
    .map((r) => enrichRelease(r));

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4">
        <DropDetailView release={release} related={related} />
      </div>
    </IntelligenceLayout>
  );
}
