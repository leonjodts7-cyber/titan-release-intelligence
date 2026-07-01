import { notFound } from "next/navigation";
import Link from "next/link";
import { getReleaseById } from "@/lib/data/releases";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReleaseDetail } from "./release-detail";

export const dynamic = "force-dynamic";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const release = await getReleaseById(id);

  if (!release) {
    notFound();
  }

  return (
    <DashboardLayout>
      <ReleaseDetail release={release} />
    </DashboardLayout>
  );
}
