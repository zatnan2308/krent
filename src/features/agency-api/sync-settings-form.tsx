"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { savePropertySyncSettings } from "@/features/agency-api/actions";
import {
  CANONICAL_OWNER_LABELS,
  CANONICAL_OWNER_MODES,
} from "@/features/agency-api/constants";
import type {
  AgentCanonicalOwner,
  PropertySyncSettings,
} from "@/features/agency-api/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  initial: PropertySyncSettings | null;
}

export function SyncSettingsForm({ initial }: Props) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashAgentSync;
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [state, setState] = React.useState({
    defaultCanonicalOwner:
      (initial?.default_canonical_owner ?? "agency") as AgentCanonicalOwner,
    hideOwnerContacts: initial?.hide_owner_contacts ?? true,
    hideInternalNotes: initial?.hide_internal_notes ?? true,
    hideCommission: initial?.hide_commission ?? true,
    hidePrivateDocuments: initial?.hide_private_documents ?? true,
  });

  async function handleSave() {
    setPending(true);
    setMessage(null);
    const result = await savePropertySyncSettings(state);
    setPending(false);
    if (result.ok) {
      setMessage(t.saved);
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium">{t.canonicalOwner}</label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={state.defaultCanonicalOwner}
          onChange={(event) =>
            setState((prev) => ({
              ...prev,
              defaultCanonicalOwner: event.target.value as AgentCanonicalOwner,
            }))
          }
        >
          {CANONICAL_OWNER_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {CANONICAL_OWNER_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {[
          {
            key: "hideOwnerContacts" as const,
            label: t.hideOwnerContacts,
          },
          {
            key: "hideInternalNotes" as const,
            label: t.hideInternalNotes,
          },
          {
            key: "hideCommission" as const,
            label: t.hideCommission,
          },
          {
            key: "hidePrivateDocuments" as const,
            label: t.hidePrivateDocuments,
          },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state[key]}
              onChange={(event) =>
                setState((prev) => ({ ...prev, [key]: event.target.checked }))
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" type="button" onClick={handleSave} disabled={pending}>
          {t.saveSettings}
        </Button>
        {message ? (
          <span className="text-xs text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </div>
  );
}
