import { Zap, LayoutDashboard, TrendingUp, Layers, BarChart3, Search, Calendar, Eye, Bell, BellRing, Activity, Radio, ScanLine, Shield, Settings, Wallet } from "lucide-react";
import { t } from "@/lib/i18n";

export const navItems = [
  { href: "/dashboard", labelKey: "nav.intelligence", icon: LayoutDashboard },
  { href: "/dashboard/opportunities", labelKey: "nav.opportunities", icon: Zap },
  { href: "/dashboard/market", labelKey: "nav.market", icon: TrendingUp },
  { href: "/dashboard/tcg", labelKey: "nav.tcg", icon: Layers },
  { href: "/dashboard/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { href: "/dashboard/releases", labelKey: "nav.releases", icon: Search },
  { href: "/dashboard/calendar", labelKey: "nav.calendar", icon: Calendar },
  { href: "/dashboard/watchlists", labelKey: "nav.watchlists", icon: Eye },
  { href: "/dashboard/portfolio", labelKey: "nav.portfolio", icon: Wallet },
  { href: "/dashboard/alerts", labelKey: "nav.alerts", icon: BellRing },
  { href: "/dashboard/notifications", labelKey: "nav.notifications", icon: Bell, badge: "notifications" as const },
  { href: "/dashboard/monitoring", labelKey: "nav.monitoring", icon: Activity },
  { href: "/dashboard/sources", labelKey: "nav.sources", icon: Radio },
  { href: "/dashboard/scans", labelKey: "nav.scans", icon: ScanLine },
  { href: "/dashboard/admin", labelKey: "nav.admin", icon: Shield },
  { href: "/dashboard/admin/setup", labelKey: "nav.setup", icon: Settings },
];

export function navLabel(labelKey: string): string {
  return t(labelKey);
}
