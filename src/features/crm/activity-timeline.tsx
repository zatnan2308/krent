import { LEAD_STATUS_LABELS } from "@/features/crm/constants";
import type { ActivityItem } from "@/features/crm/queries";
import type { LeadStatus } from "@/features/crm/types";
import { EmptyState } from "@/components/ui/empty-state";
import type { getServerDictionary } from "@/lib/i18n/runtime";

type CrmDict = Awaited<ReturnType<typeof getServerDictionary>>["dashCrm"];

/** Человекочитаемое описание записи активности по action + metadata. */
function describe(
  action: string,
  metadata: Record<string, unknown>,
  t: CrmDict,
): string {
  const status = typeof metadata.status === "string" ? metadata.status : null;
  const stage = typeof metadata.stage === "string" ? metadata.stage : null;
  switch (action) {
    case "lead.status_changed":
      return t.actStatusChanged.replace(
        "{status}",
        status
          ? (LEAD_STATUS_LABELS[status as LeadStatus] ?? status)
          : t.aNewStatus,
      );
    case "lead.assigned":
      return t.actLeadAssigned;
    case "lead.unassigned":
      return t.actLeadUnassigned;
    case "lead.converted":
      return t.actLeadConverted;
    case "deal.created":
      return t.actDealCreated;
    case "deal.stage_changed":
      return `${t.actDealStageChanged.replace("{stage}", stage ?? t.aNewStage)}${
        status ? ` · ${status}` : ""
      }`;
    case "deal.updated":
      return t.actDealUpdated;
    case "note.created":
      return t.actNoteAdded;
    case "note.deleted":
      return t.actNoteDeleted;
    case "task.created":
      return t.actTaskCreated;
    case "task.status_changed":
      return t.actTaskStatusChanged;
    case "task.deleted":
      return t.actTaskDeleted;
    default:
      return action.replace(/[._]/g, " ");
  }
}

/** Лента активности CRM-сущности (read-only, из audit_logs). */
export function ActivityTimeline({
  items,
  t,
}: {
  items: ActivityItem[];
  t: CrmDict;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={t.noActivityTitle}
        description={t.noActivityDesc}
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
            <p>{describe(item.action, item.metadata, t)}</p>
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
