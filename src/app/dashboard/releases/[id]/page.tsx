import { notFound } from "next/navigation";
import { getReleaseById, getReleases } from "@/lib/data/releases";
import { enrichRelease, enrichReleases } from "@/lib/data/enrich-releases";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReleaseDetail } from "./release-detail";

export const dynamic = "force-dynamic";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getReleaseById(id);

  if (!raw) {
    notFound();
  }

  const release = enrichRelease(raw);
  const all = enrichReleases(await getReleases());
  const similarReleases = all
    .filter((r) => r.id !== id && (
      r.category_id === release.category_id ||
      r.priority_level === release.priority_level ||
      r.release_categories?.slug === release.release_categories?.slug
    ))
    .slice(0, 4);

  return (
    <DashboardLayout>
      <ReleaseDetail release={release} similarReleases={similarReleases} />
    </DashboardLayout>
  );
}
