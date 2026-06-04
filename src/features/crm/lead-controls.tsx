"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  assignLeadToSelf,
  convertLeadToDeal,
  setLeadStatus,
  unassignLead,
} from "@/features/crm/actions";
import { LEAD_STATUS_OPTIONS } from "@/features/crm/constants";
import type { ActionResult } from "@/features/crm/schema";
import type { LeadStatus } from "@/features/crm/types";
import { Button } from "@/components/ui/button";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface LeadControlsProps {
  leadId: string;
  status: LeadStatus;
  assigned: boolean;
  canManage: boolean;
  /** crm.manage_all — нужно, чтобы снять назначение (см. RLS). */
  canManageAll: boolean;
}

/** Управление лидом: статус, назначение, конвертация в сделку. */
export function LeadControls({
  leadId,
  status,
  assigned,
  canManage,
  canManageAll,
}: LeadControlsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
        You have read-only access to this lead.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="lead-status" className="text-sm font-medium">
          Status
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

      <div className="flex flex-wrap gap-2">
        {assigned ? (
          canManageAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => unassignLead(leadId))}
            >
              Unassign
            </Button>
          ) : null
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => assignLeadToSelf(leadId))}
          >
            Assign to me
          </Button>
        )}
        {status === "converted" ? (
          <span className="inline-flex items-center text-sm text-muted-foreground">
            Converted to a deal
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => convertLeadToDeal(leadId))}
          >
            Convert to deal
          </Button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
