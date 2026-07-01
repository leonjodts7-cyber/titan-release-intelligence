"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, LayoutDashboard, Calendar, Bell, Eye, Radio,
  ScanLine,   Shield, Search, Menu, X, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/dashboard/releases", label: "Releases", icon: Search },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/watchlists", label: "Watchlists", icon: Eye },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/sources", label: "Sources", icon: Radio },
  { href: "/dashboard/scans", label: "Scans", icon: ScanLine },
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
  { href: "/dashboard/admin/setup", label: "Setup", icon: Settings },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-titan-surface border-r border-titan-border flex flex-col transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex items-center justify-between border-b border-titan-border">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-titan-accent" />
            <span className="font-bold tracking-tight">TITAN</span>
          </Link>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-titan-accent/10 text-titan-accent border border-titan-accent/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-titan-border">
          <div className="text-xs text-zinc-500">Release Intelligence OS</div>
          <div className="text-xs text-zinc-600 mt-0.5">v1.0.0 MVP</div>
        </div>
      </aside>
    </>
  );
}

export { Menu };
