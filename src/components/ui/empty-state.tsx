import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && <Icon className="w-8 h-8 text-titan-muted mb-3 opacity-60" />}
      <p className="text-sm text-titan-muted max-w-sm">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
