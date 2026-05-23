"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  connectGoogleAds,
  connectGsc,
  connectMetaAds,
  disconnectIntegration,
} from "@/features/integrations/actions";
import {
  PROVIDER_DESCRIPTIONS,
  PROVIDER_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from "@/features/integrations/constants";
import type { ConnectionItem } from "@/features/integrations/queries";
import type { IntegrationProvider } from "@/features/integrations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FormState {
  siteUrl: string;
  accountId: string;
  customerId: string;
  managerCustomerId: string;
  adAccountId: string;
  businessId: string;
  currency: string;
  displayName: string;
}

const EMPTY_FORM: FormState = {
  siteUrl: "",
  accountId: "",
  customerId: "",
  managerCustomerId: "",
  adAccountId: "",
  businessId: "",
  currency: "USD",
  displayName: "",
};

export function ConnectionCard({
  provider,
  connection,
}: {
  provider: IntegrationProvider;
  connection: ConnectionItem | null;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>({
    ...EMPTY_FORM,
    displayName: connection?.displayName ?? PROVIDER_LABELS[provider],
    accountId: provider === "gsc" ? (connection?.accountId ?? "") : "",
    customerId:
      provider === "google_ads" ? (connection?.accountId ?? "") : "",
    adAccountId:
      provider === "meta_ads" ? (connection?.accountId ?? "") : "",
  });
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleConnect() {
    setPending(true);
    setMessage(null);
    let result;
    if (provider === "gsc") {
      result = await connectGsc({
        siteUrl: form.siteUrl.trim(),
        accountId: form.accountId.trim(),
        displayName: form.displayName.trim() || PROVIDER_LABELS.gsc,
      });
    } else if (provider === "google_ads") {
      result = await connectGoogleAds({
        customerId: form.customerId.trim(),
        managerCustomerId: form.managerCustomerId.trim() || null,
        currency: form.currency.trim() || "USD",
        displayName: form.displayName.trim() || PROVIDER_LABELS.google_ads,
      });
    } else {
      result = await connectMetaAds({
        adAccountId: form.adAccountId.trim(),
        businessId: form.businessId.trim() || null,
        currency: form.currency.trim() || "USD",
        displayName: form.displayName.trim() || PROVIDER_LABELS.meta_ads,
      });
    }
    setPending(false);
    if (result.ok) {
      setMessage("Connected.");
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleDisconnect() {
    if (!connection) {
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await disconnectIntegration(connection.id);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {PROVIDER_LABELS[provider]}
          </p>
          <p className="text-xs text-muted-foreground">
            {PROVIDER_DESCRIPTIONS[provider]}
          </p>
        </div>
        {connection ? (
          <Badge variant={STATUS_BADGE[connection.status]}>
            {STATUS_LABELS[connection.status]}
          </Badge>
        ) : (
          <Badge variant="outline">Not connected</Badge>
        )}
      </div>

      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs">
        <p className="font-medium">OAuth connect</p>
        <p className="mt-1 text-muted-foreground">
          Requires API credentials in env vars. See{" "}
          <code>docs/setup/{provider === "meta_ads" ? "meta-integrations-setup.md" : "google-integrations-setup.md"}</code>.
          Once configured, this button starts the secure OAuth flow.
        </p>
        <a
          href={`/api/integrations/oauth/${provider}/start`}
          className="mt-2 inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent"
        >
          Connect with OAuth
        </a>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Display name</label>
          <Input
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
          />
        </div>

        {provider === "gsc" ? (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium">Site URL</label>
              <Input
                value={form.siteUrl}
                placeholder="https://example.com/"
                onChange={(event) => update("siteUrl", event.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium">
                Google account email
              </label>
              <Input
                value={form.accountId}
                placeholder="ads@example.com"
                onChange={(event) =>
                  update("accountId", event.target.value)
                }
              />
            </div>
          </>
        ) : null}

        {provider === "google_ads" ? (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Customer ID
              </label>
              <Input
                value={form.customerId}
                placeholder="123-456-7890"
                onChange={(event) =>
                  update("customerId", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Manager (MCC) ID
              </label>
              <Input
                value={form.managerCustomerId}
                placeholder="optional"
                onChange={(event) =>
                  update("managerCustomerId", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Currency</label>
              <Input
                value={form.currency}
                placeholder="USD"
                onChange={(event) =>
                  update("currency", event.target.value)
                }
              />
            </div>
          </>
        ) : null}

        {provider === "meta_ads" ? (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Ad account ID
              </label>
              <Input
                value={form.adAccountId}
                placeholder="act_1234567890"
                onChange={(event) =>
                  update("adAccountId", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Business manager ID
              </label>
              <Input
                value={form.businessId}
                placeholder="optional"
                onChange={(event) =>
                  update("businessId", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Currency</label>
              <Input
                value={form.currency}
                placeholder="USD"
                onChange={(event) =>
                  update("currency", event.target.value)
                }
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={pending} onClick={handleConnect}>
          {connection ? "Update connection" : "Connect"}
        </Button>
        {connection && connection.status !== "disconnected" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={pending}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        ) : null}
        {message ? (
          <span className="text-xs text-muted-foreground">{message}</span>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Real OAuth flow is wired separately — saving stores the account
        reference; tokens remain blank until OAuth is enabled.
      </p>
    </div>
  );
}
