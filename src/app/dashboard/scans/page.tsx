import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const MOCK_SCANS = [
  { id: "1", source: "Nike SNKRS", status: "completed", started: new Date(Date.now() - 120000).toISOString(), found: 2, created: 1, updated: 0, skipped: 1 },
  { id: "2", source: "Ticketmaster", status: "completed", started: new Date(Date.now() - 900000).toISOString(), found: 5, created: 0, updated: 1, skipped: 4 },
  { id: "3", source: "UEFA", status: "completed", started: new Date(Date.now() - 3600000).toISOString(), found: 1, created: 0, updated: 0, skipped: 1 },
  { id: "4", source: "Eventim", status: "failed", started: new Date(Date.now() - 2700000).toISOString(), found: 0, created: 0, updated: 0, skipped: 0, error: "Rate limited - retry in 15min" },
  { id: "5", source: "Adidas Confirmed", status: "running", started: new Date(Date.now() - 30000).toISOString(), found: 0, created: 0, updated: 0, skipped: 0 },
];

export default function ScansPage() {
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
              {MOCK_SCANS.map((scan) => (
                <tr key={scan.id} className="border-b border-titan-border/50">
                  <td className="py-3 pr-4 font-medium">{scan.source}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1">
                      {scan.status === "completed" && <CheckCircle className="w-3 h-3 text-green-500" />}
                      {scan.status === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
                      {scan.status === "running" && <Clock className="w-3 h-3 text-yellow-500 animate-pulse" />}
                      {scan.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-500">{formatDate(scan.started)}</td>
                  <td className="py-3 pr-4">{scan.found}</td>
                  <td className="py-3 pr-4 text-green-400">{scan.created}</td>
                  <td className="py-3 pr-4 text-blue-400">{scan.updated}</td>
                  <td className="py-3 text-zinc-500">{scan.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
