"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createApiKey, revokeApiKey } from "@/features/agency-api/actions";
import {
  API_SCOPE_DESCRIPTIONS,
  API_SCOPE_KEYS,
} from "@/features/agency-api/constants";
import type { ApiScopeKey } from "@/features/agency-api/types";
import type { ApiKeyDto } from "@/features/agency-api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  keys: ApiKeyDto[];
}

interface FormState {
  name: string;
  agentId: string;
  scopes: ApiScopeKey[];
  allowedDomains: string;
  rateLimitPerMinute: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  agentId: "",
  scopes: ["read:properties"],
  allowedDomains: "",
  rateLimitPerMinute: 60,
};

export function ApiKeysSection({ keys }: Props) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashAgentSync;
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

  function toggleScope(scope: ApiScopeKey) {
    setForm((prev) => {
      const has = prev.scopes.includes(scope);
      return {
        ...prev,
        scopes: has
          ? prev.scopes.filter((value) => value !== scope)
          : [...prev.scopes, scope],
      };
    });
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setMessage(t.errNameReq);
      return;
    }
    if (form.scopes.length === 0) {
      setMessage(t.errScopeReq);
      return;
    }
    setPending(true);
    setMessage(null);
    setCreatedKey(null);
    const result = await createApiKey({
      name: form.name.trim(),
      agentId: form.agentId.trim() || null,
      scopes: form.scopes,
      allowedDomains: form.allowedDomains
        .split(/[,\n\s]+/)
        .map((value) => value.trim())
        .filter(Boolean),
      rateLimitPerMinute: form.rateLimitPerMinute,
    });
    setPending(false);
    if (result.ok) {
      setForm(EMPTY_FORM);
      setCreatedKey(result.rawKey);
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleRevoke(id: string) {
    setPending(true);
    const result = await revokeApiKey({ id });
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {createdKey ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">{t.copyKeyNow}</p>
          <p className="mt-1 break-all font-mono text-xs">{createdKey}</p>
          <p className="mt-2 text-xs">{t.keyOnce}</p>
        </div>
      ) : null}

      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noKeys}</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div className="space-y-1">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  Prefix <code>{row.keyPrefix}…</code> · Scopes:{" "}
                  {row.scopes.join(", ") || "—"} · Limit{" "}
                  {row.rateLimitPerMinute}/min
                </p>
                <p className="text-xs text-muted-foreground">
                  Domains: {row.allowedDomains.join(", ") || "any"} · Last used:{" "}
                  {row.lastUsedAt
                    ? new Date(row.lastUsedAt).toLocaleString()
                    : "never"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={row.status === "active" ? "default" : "secondary"}>
                  {row.status}
                </Badge>
                {row.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => handleRevoke(row.id)}
                  >
                    {t.revoke}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-semibold">{t.createKey}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.fName}</label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.fAgentIdOptional}</label>
            <Input
              value={form.agentId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, agentId: event.target.value }))
              }
              placeholder={t.agentIdBlank}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium">{t.allowedDomainsCsv}</label>
            <Input
              value={form.allowedDomains}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  allowedDomains: event.target.value,
                }))
              }
              placeholder="agent.example.com, *.example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.rateLimit}</label>
            <Input
              type="number"
              min={1}
              max={6000}
              value={form.rateLimitPerMinute}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  rateLimitPerMinute: Math.max(
                    1,
                    Number.parseInt(event.target.value, 10) || 60,
                  ),
                }))
              }
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium">{t.scopesLabel}</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {API_SCOPE_KEYS.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                <span>
                  <code>{scope}</code> — {API_SCOPE_DESCRIPTIONS[scope]}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" type="button" onClick={handleCreate} disabled={pending}>
            {t.generateKey}
          </Button>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
