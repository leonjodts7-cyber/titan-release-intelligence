import {
  Sun,
  CalendarDays,
  Footprints,
  Ticket,
  Layers,
  Flame,
  TrendingUp,
  Wallet,
  Bell,
  Server,
  Settings,
} from "lucide-react";
import { t } from "@/lib/i18n";

export const navItems = [
  { href: "/dashboard", labelKey: "nav.today", icon: Sun },
  { href: "/dashboard/kalender", labelKey: "nav.calendar", icon: CalendarDays },
  { href: "/dashboard/schoenen", labelKey: "nav.shoes", icon: Footprints },
  { href: "/dashboard/tickets", labelKey: "nav.tickets", icon: Ticket },
  { href: "/dashboard/kaarten", labelKey: "nav.cards", icon: Layers },
  { href: "/dashboard/knallers", labelKey: "nav.knallers", icon: Flame },
  { href: "/dashboard/market", labelKey: "nav.market", icon: TrendingUp },
  { href: "/dashboard/portfolio", labelKey: "nav.portfolio", icon: Wallet },
  { href: "/dashboard/meldingen", labelKey: "nav.notifications", icon: Bell, badge: "notifications" as const },
  { href: "/dashboard/systeem", labelKey: "nav.system", icon: Server },
  { href: "/dashboard/instellingen", labelKey: "nav.settings", icon: Settings },
];

export function navLabel(labelKey: string): string {
  return t(labelKey);
}
