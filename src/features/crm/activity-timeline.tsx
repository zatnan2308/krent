import { LEAD_STATUS_LABELS } from "@/features/crm/constants";
import type { ActivityItem } from "@/features/crm/queries";
import type { LeadStatus } from "@/features/crm/types";
import { EmptyState } from "@/components/ui/empty-state";

/** Человекочитаемое описание записи активности по action + metadata. */
function describe(action: string, metadata: Record<string, unknown>): string {
  const status = typeof metadata.status === "string" ? metadata.status : null;
  const stage = typeof metadata.stage === "string" ? metadata.stage : null;
  switch (action) {
    case "lead.status_changed":
      return `Status changed to ${
        status
          ? (LEAD_STATUS_LABELS[status as LeadStatus] ?? status)
          : "a new status"
      }`;
    case "lead.assigned":
      return "Lead assigned to an agent";
    case "lead.unassigned":
      return "Lead unassigned";
    case "lead.converted":
      return "Converted to a deal";
    case "deal.created":
      return "Deal created";
    case "deal.stage_changed":
      return `Moved to ${stage ?? "a new stage"}${status ? ` · ${status}` : ""}`;
    case "deal.updated":
      return "Deal details updated";
    default:
      return action.replace(/[._]/g, " ");
  }
}

/** Лента активности CRM-сущности (read-only, из audit_logs). */
export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Status changes, assignments and updates will appear here."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 text-sm">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40"
            aria-hidden
          />
          <div className="min-w-0">
            <p>{describe(item.action, item.metadata)}</p>
            <p className="text-xs text-muted-foreground">
              {item.actorName ? `${item.actorName} · ` : ""}
              {new Date(item.createdAt).toLocaleString("en-US")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
