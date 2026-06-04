import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 p-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-background text-muted-foreground shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
