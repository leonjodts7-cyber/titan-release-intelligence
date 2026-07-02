import { redirect } from "next/navigation";

export default async function LegacyReleaseRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/drops/${id}`);
}
