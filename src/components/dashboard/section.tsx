import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function DashboardSection({ title, subtitle, count, children, className, action }: DashboardSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            {title}
            {count !== undefined && (
              <span className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-zinc-500">{count}</span>
            )}
          </h2>
          {subtitle && <p className="text-xs text-zinc-600 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, trend, color }: {
  label: string;
  value: string | number;
  trend?: string;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-titan-surface border border-titan-border">
      <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={cn("text-2xl font-bold mt-1", color)}>{value}</div>
      {trend && <div className="text-xs text-zinc-600 mt-1">{trend}</div>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-titan-border rounded-xl">
      {message}
    </div>
  );
}
