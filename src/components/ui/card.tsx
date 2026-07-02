import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-titan-border bg-titan-surface",
        padding === "md" ? "p-3" : "p-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-section-label font-semibold uppercase tracking-wider text-titan-muted", className)}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-1">
      <h1 className="text-page-title font-bold text-zinc-100">{title}</h1>
      {subtitle && <p className="text-caption text-titan-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}
