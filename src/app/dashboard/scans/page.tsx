import { getScanJobs } from "@/lib/data/sources";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ScansPage() {
  const scans = await getScanJobs(30);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Scan Activity</h1>
          <p className="text-zinc-500 text-sm mt-1">Pipeline scan job logs and results</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-titan-border">
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Started</th>
                <th className="pb-3 pr-4">Found</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3 pr-4">Updated</th>
                <th className="pb-3">Skipped</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id} className="border-b border-titan-border/50 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <Link href="/dashboard/sources" className="font-medium hover:text-titan-accent">
                      {scan.source_adapters?.name ?? scan.source_adapter_id}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1">
                      {scan.status === "completed" && <CheckCircle className="w-3 h-3 text-green-500" />}
                      {scan.status === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
                      {scan.status === "running" && <Clock className="w-3 h-3 text-yellow-500" />}
                      {scan.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-500">{formatDate(scan.started_at)}</td>
                  <td className="py-3 pr-4">{scan.items_found}</td>
                  <td className="py-3 pr-4 text-green-400">{scan.items_created}</td>
                  <td className="py-3 pr-4 text-blue-400">{scan.items_updated}</td>
                  <td className="py-3 text-zinc-500">{scan.items_skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
