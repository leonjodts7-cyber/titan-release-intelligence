"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const INTEL_LINES = [
  "Scan voltooid — 2 nieuwe kansen gevonden",
  "Air Jordan 1 · verwachte netto ROI +135%",
  "12 kritieke kansen live",
];

export function AuthIntelPanel() {
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setLineIndex((i) => (i + 1) % INTEL_LINES.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative hidden lg:flex lg:w-[55%] flex-col bg-titan-bg border-r border-titan-border overflow-hidden">
      <div className="absolute inset-0 auth-grid-glow" aria-hidden />
      <div className="absolute inset-x-0 top-1/3 h-48 opacity-40" aria-hidden>
        <svg viewBox="0 0 400 120" className="w-full h-full auth-sparkline" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,80 C40,70 60,40 100,50 S160,90 200,60 S280,20 320,45 S380,75 400,55"
            fill="none"
            stroke="url(#sparkGrad)"
            strokeWidth="1.5"
            className="auth-sparkline-path"
          />
          <path
            d="M0,95 C50,85 80,60 130,70 S200,100 260,75 S340,50 400,65"
            fill="none"
            stroke="#6366f1"
            strokeWidth="0.5"
            strokeOpacity="0.25"
            className="auth-sparkline-path-delayed"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full p-10">
        <Link href="/" className="inline-flex items-center gap-2.5 w-fit">
          <Zap className="w-5 h-5 text-titan-accent" />
          <span className="font-bold text-lg tracking-tight">TITAN</span>
        </Link>

        <div className="flex-1" />

        <p
          className={cn(
            "font-mono text-sm text-titan-accent/90 transition-opacity duration-300",
            visible ? "opacity-100" : "opacity-0"
          )}
          aria-live="polite"
        >
          {">"} {INTEL_LINES[lineIndex]}
        </p>
      </div>
    </div>
  );
}
