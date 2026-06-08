"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  assignLeadToSelf,
  convertLeadToDeal,
  reassignLead,
  setLeadAppointment,
  setLeadStatus,
} from "@/features/crm/actions";
import { LEAD_STATUS_OPTIONS } from "@/features/crm/constants";
import type { ActionResult } from "@/features/crm/schema";
import type { LeadStatus } from "@/features/crm/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** ISO (UTC) → значение для datetime-local (локальная зона браузера). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

interface LeadControlsProps {
  leadId: string;
  status: LeadStatus;
  assigned: boolean;
  canManage: boolean;
  /** crm.manage_all — нужно для (ре)назначения лида другому агенту (см. RLS). */
  canManageAll: boolean;
  /** Агенты организации — для селекта реассайна (только при manage_all). */
  agents: { id: string; name: string }[];
  assignedAgentId: string | null;
  /** Назначенное время показа (ISO) — для раздела Appointments портала. */
  scheduledAt: string | null;
}

/** Управление лидом: статус, назначение, конвертация в сделку. */
export function LeadControls({
  leadId,
  status,
  assigned,
  canManage,
  canManageAll,
  agents,
  assignedAgentId,
  scheduledAt,
}: LeadControlsProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [appointment, setAppointment] = React.useState(
    toLocalInput(scheduledAt),
  );

  async function run(action: () => Promise<ActionResult>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.readOnlyLead}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="lead-status" className="text-sm font-medium">
          {t.status}
        </label>
        <select
          id="lead-status"
          className={FIELD_CLASS}
          value={status}
          disabled={pending}
          onChange={(event) =>
            run(() => setLeadStatus(leadId, event.target.value))
          }
        >
          {LEAD_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {canManageAll ? (
        <div className="space-y-1.5">
          <label htmlFor="lead-agent" className="text-sm font-medium">
            {t.assignedAgent}
          </label>
          <select
            id="lead-agent"
            className={FIELD_CLASS}
            value={assignedAgentId ?? ""}
            disabled={pending}
            onChange={(event) =>
              run(() =>
                reassignLead({ leadId, agentId: event.target.value || null }),
              )
            }
          >
            <option value="">{t.unassigned}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!canManageAll && !assigned ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => assignLeadToSelf(leadId))}
          >
            {t.assignToMe}
          </Button>
        ) : null}
        {status === "converted" ? (
          <span className="inline-flex items-center text-sm text-muted-foreground">
            {t.convertedToDeal}
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => convertLeadToDeal(leadId))}
          >
            {t.convertToDeal}
          </Button>
        )}
      </div>

      <div className="space-y-1.5 border-t pt-3">
        <label htmlFor="lead-appointment" className="text-sm font-medium">
          {t.appointmentLabel}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="lead-appointment"
            type="datetime-local"
            className={`${FIELD_CLASS} sm:w-auto`}
            value={appointment}
            disabled={pending}
            onChange={(event) => setAppointment(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() =>
                setLeadAppointment({
                  leadId,
                  scheduledAt: appointment || null,
                }),
              )
            }
          >
            {t.saveAppointment}
          </Button>
          {appointment ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setAppointment("");
                void run(() =>
                  setLeadAppointment({ leadId, scheduledAt: null }),
                );
              }}
            >
              {t.clearAppointment}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
