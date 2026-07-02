import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_AUTH_ENABLED: process.env.AUTH_ENABLED ?? "false",
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return [
      { source: "/dashboard/opportunities", destination: "/dashboard/drops", permanent: false },
      { source: "/dashboard/releases", destination: "/dashboard/drops", permanent: false },
      { source: "/dashboard/calendar", destination: "/dashboard/drops?view=calendar", permanent: false },
      { source: "/dashboard/tcg", destination: "/dashboard/market?tab=tcg", permanent: false },
      { source: "/dashboard/analytics", destination: "/dashboard/systeem?tab=analyses", permanent: false },
      { source: "/dashboard/watchlists", destination: "/dashboard/instellingen?tab=volglijsten", permanent: false },
      { source: "/dashboard/alerts", destination: "/dashboard/meldingen?tab=waarschuwingen", permanent: false },
      { source: "/dashboard/notifications", destination: "/dashboard/meldingen", permanent: false },
      { source: "/dashboard/monitoring", destination: "/dashboard/systeem?tab=monitoring", permanent: false },
      { source: "/dashboard/sources", destination: "/dashboard/systeem?tab=bronnen", permanent: false },
      { source: "/dashboard/scans", destination: "/dashboard/systeem?tab=scans", permanent: false },
      { source: "/dashboard/admin", destination: "/dashboard/systeem?tab=beheer", permanent: false },
      { source: "/dashboard/admin/setup", destination: "/dashboard/instellingen", permanent: false },
    ];
  },
};

export default nextConfig;
