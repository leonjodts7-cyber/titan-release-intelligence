"use client";

import { Sidebar, Menu } from "@/components/layout/sidebar";
import { DemoModeBanner } from "@/components/layout/demo-banner";
import { GlobalSearch } from "@/components/intelligence/global-search";
import { LiveActivityPanel } from "@/components/intelligence/live-activity-panel";
import type { ActivityFeedItem } from "@/lib/data/activity-feed";
import { useState } from "react";

interface IntelligenceLayoutProps {
  children: React.ReactNode;
  activityFeed?: ActivityFeedItem[];
  showFeed?: boolean;
}

export function IntelligenceLayout({ children, activityFeed, showFeed = true }: IntelligenceLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-titan-bg">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-3 py-2 border-b border-titan-border bg-titan-surface/80 backdrop-blur sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm tracking-tight lg:hidden">TITAN</span>
          <div className="flex-1 flex justify-center lg:justify-start lg:ml-0">
            <GlobalSearch />
          </div>
        </header>
        <DemoModeBanner />
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 overflow-auto min-w-0">{children}</main>
          {showFeed && (
            <div className="hidden xl:block w-72 shrink-0">
              <LiveActivityPanel initialItems={activityFeed} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
