"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Zap, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setUnread((d.notifications ?? []).filter((n: { status: string }) => n.status !== "read").length))
      .catch(() => {});
  }, []);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-56 bg-titan-surface border-r border-titan-border flex flex-col transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-3 py-3 flex items-center justify-between border-b border-titan-border">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-titan-accent" />
            <div>
              <span className="font-bold text-sm tracking-tight block">TITAN</span>
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Intelligence</span>
            </div>
          </Link>
          {onClose && <button onClick={onClose} className="lg:hidden p-1"><X className="w-4 h-4" /></button>}
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            const showBadge = badge === "notifications" && unread > 0;
            return (
              <Link key={href} href={href} onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] transition-colors",
                  active ? "bg-titan-accent/10 text-titan-accent border border-titan-accent/20" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
                )}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-titan-accent text-white text-[9px] font-mono flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-2 border-t border-titan-border text-[9px] text-zinc-600 font-mono">
          v2.0 · Intelligence Platform
        </div>
      </aside>
    </>
  );
}

export { Menu };
