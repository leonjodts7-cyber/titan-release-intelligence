"use client";

import type { ReactNode } from "react";
import { AuthIntelPanel } from "@/components/auth/auth-intel-panel";

interface AuthShellProps {
  children: ReactNode;
  shake?: boolean;
}

export function AuthShell({ children, shake }: AuthShellProps) {
  return (
    <div className="min-h-screen flex bg-titan-bg">
      <AuthIntelPanel />
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div
          className={`w-full max-w-md rounded-xl border border-titan-border bg-titan-surface p-8 shadow-xl shadow-black/20 ${shake ? "auth-shake" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
