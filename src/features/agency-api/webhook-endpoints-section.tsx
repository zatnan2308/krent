"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  deleteWebhookEndpoint,
  rotateWebhookEndpointSecret,
  saveWebhookEndpoint,
} from "@/features/agency-api/actions";
import {
  WEBHOOK_EVENT_DESCRIPTIONS,
  WEBHOOK_EVENT_TYPES,
} from "@/features/agency-api/constants";
import type {
  WebhookEndpoint,
  WebhookEventType,
} from "@/features/agency-api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  endpoints: WebhookEndpoint[];
}

interface FormState {
  url: string;
  secret: string;
  eventTypes: WebhookEventType[];
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  url: "",
  secret: "",
  eventTypes: ["lead.created"],
  isActive: true,
};

export function WebhookEndpointsSection({ endpoints }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  // Новый секрет показываем разово после ротации — повторно его не достать.
  const [rotated, setRotated] = React.useState<{
    id: string;
    secret: string;
  } | null>(null);

  function toggleEvent(type: WebhookEventType) {
    setForm((prev) => {
      const has = prev.eventTypes.includes(type);
      return {
        ...prev,
        eventTypes: has
          ? prev.eventTypes.filter((value) => value !== type)
          : [...prev.eventTypes, type],
      };
    });
  }

  async function handleCreate() {
    if (!form.url.trim()) {
      setMessage("URL is required.");
      return;
    }
    if (form.eventTypes.length === 0) {
      setMessage("Select at least one event.");
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await saveWebhookEndpoint({
      id: null,
      agentWebsiteConnectionId: null,
      url: form.url.trim(),
      secret: form.secret.trim() || null,
      eventTypes: form.eventTypes,
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
    const result = await deleteWebhookEndpoint({ id });
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleRotate(id: string) {
    setPending(true);
    setMessage(null);
    setRotated(null);
    const result = await rotateWebhookEndpointSecret({ id });
    setPending(false);
    if (result.ok) {
      setRotated({ id, secret: result.secret });
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {endpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No webhook endpoints configured.
        </p>
      ) : (
        <ul className="space-y-2">
          {endpoints.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div className="space-y-1">
                <p className="font-medium">{row.url}</p>
                <p className="text-xs text-muted-foreground">
                  Events: {row.event_types.join(", ") || "all"} · Secret:{" "}
                  {row.secret ? "set" : "—"} · Last success:{" "}
                  {row.last_success_at
                    ? new Date(row.last_success_at).toLocaleString()
                    : "never"}
                </p>
                {rotated?.id === row.id ? (
                  <div className="mt-1 space-y-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2">
                    <p className="text-xs font-medium text-emerald-700">
                      New secret — copy it now, it won&apos;t be shown again:
                    </p>
                    <code className="block break-all text-xs">
                      {rotated.secret}
                    </code>
                    <p className="text-[11px] text-muted-foreground">
                      The previous secret stays valid briefly so in-flight
                      deliveries keep verifying.
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={row.is_active ? "default" : "secondary"}>
                  {row.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleRotate(row.id)}
                >
                  Rotate secret
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => handleDelete(row.id)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-semibold">Add a webhook endpoint</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium">URL</label>
            <Input
              value={form.url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, url: event.target.value }))
              }
              placeholder="https://agent-site.com/api/krent-webhook"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium">
              Signing secret (HMAC-SHA256, optional)
            </label>
            <Input
              value={form.secret}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, secret: event.target.value }))
              }
              placeholder="Used to compute x-krent-signature"
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium">Subscribe to events</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {WEBHOOK_EVENT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.eventTypes.includes(type)}
                  onChange={() => toggleEvent(type)}
                />
                <span>
                  <code>{type}</code> — {WEBHOOK_EVENT_DESCRIPTIONS[type]}
                </span>
              </label>
            ))}
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
          <span>Active</span>
        </label>
        <div className="flex items-center gap-3">
          <Button size="sm" type="button" onClick={handleCreate} disabled={pending}>
            Save endpoint
          </Button>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
