import { Zap, LayoutDashboard, TrendingUp, Layers, BarChart3, Search, Calendar, Eye, Bell, BellRing, Activity, Radio, ScanLine, Shield, Settings, Wallet } from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Intelligence", icon: LayoutDashboard },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Zap },
  { href: "/dashboard/market", label: "Market", icon: TrendingUp },
  { href: "/dashboard/tcg", label: "TCG", icon: Layers },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/releases", label: "Releases", icon: Search },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/watchlists", label: "Watchlists", icon: Eye },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: "notifications" as const },
  { href: "/dashboard/monitoring", label: "Monitoring", icon: Activity },
  { href: "/dashboard/sources", label: "Sources", icon: Radio },
  { href: "/dashboard/scans", label: "Scans", icon: ScanLine },
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
  { href: "/dashboard/admin/setup", label: "Setup", icon: Settings },
];
