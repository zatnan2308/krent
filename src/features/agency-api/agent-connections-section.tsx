"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  deleteAgentConnection,
  saveAgentConnection,
} from "@/features/agency-api/actions";
import {
  CANONICAL_OWNER_LABELS,
  CANONICAL_OWNER_MODES,
} from "@/features/agency-api/constants";
import type {
  AgentCanonicalOwner,
  AgentWebsiteConnection,
} from "@/features/agency-api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  connections: AgentWebsiteConnection[];
}

interface FormState {
  agentId: string;
  name: string;
  primaryDomain: string;
  canonicalOwner: AgentCanonicalOwner;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  agentId: "",
  name: "",
  primaryDomain: "",
  canonicalOwner: "agency",
  isActive: true,
};

export function AgentConnectionsSection({ connections }: Props) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashAgentSync;
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

  async function handleCreate() {
    if (!form.agentId.trim() || !form.name.trim()) {
      setMessage(t.errAgentName);
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await saveAgentConnection({
      id: null,
      agentId: form.agentId.trim(),
      name: form.name.trim(),
      primaryDomain: form.primaryDomain.trim() || null,
      canonicalOwner: form.canonicalOwner,
      isActive: form.isActive,
    });
    setPending(false);
    if (result.ok) {
      setForm(EMPTY_FORM);
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleDelete(id: string) {
    setPending(true);
    const result = await deleteAgentConnection({ id });
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {connections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noConnections}</p>
      ) : (
        <ul className="space-y-2">
          {connections.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div className="space-y-1">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  Agent: <code>{row.agent_id}</code> · Domain:{" "}
                  {row.primary_domain ?? "—"} · Canonical:{" "}
                  {CANONICAL_OWNER_LABELS[row.canonical_owner]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={row.is_active ? "default" : "secondary"}>
                  {row.is_active ? t.active : t.inactive}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => handleDelete(row.id)}
                >
                  {t.remove}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-semibold">{t.connectNew}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.agentUserIdUuid}</label>
            <Input
              value={form.agentId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, agentId: event.target.value }))
              }
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.displayName}</label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Jane Doe — agent site"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.primaryDomain}</label>
            <Input
              value={form.primaryDomain}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  primaryDomain: event.target.value,
                }))
              }
              placeholder="agent.example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.seoCanonical}</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.canonicalOwner}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  canonicalOwner: event.target.value as AgentCanonicalOwner,
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
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, isActive: event.target.checked }))
            }
          />
          <span>{t.active}</span>
        </label>
        <div className="flex items-center gap-3">
          <Button size="sm" type="button" onClick={handleCreate} disabled={pending}>
            {t.addConnection}
          </Button>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
