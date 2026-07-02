import { cn } from "@/lib/utils";

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-titan-border overflow-hidden animate-pulse">
      <div className="h-8 bg-titan-surface border-b border-titan-border" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 px-2 py-2.5 border-b border-titan-border/40">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className={cn("h-3 rounded bg-titan-surface-raised", j === 0 ? "w-6" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-titan-surface border border-titan-border" />
      ))}
    </div>
  );
}
