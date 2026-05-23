"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { savePaymentProvider } from "@/features/payments/actions";
import {
  PAYMENT_PROVIDER_DESCRIPTIONS,
  PAYMENT_PROVIDER_LABELS,
} from "@/features/payments/constants";
import type { ProviderSetting } from "@/features/payments/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Карточка настроек одного платёжного провайдера. */
function ProviderCard({
  setting,
  canManage,
}: {
  setting: ProviderSetting;
  canManage: boolean;
}) {
  const router = useRouter();
  const { provider, row, account, operational } = setting;

  const [enabled, setEnabled] = React.useState(row?.is_enabled ?? false);
  const [displayName, setDisplayName] = React.useState(
    row?.display_name ?? PAYMENT_PROVIDER_LABELS[provider],
  );
  const [mode, setMode] = React.useState<"test" | "live">(
    row?.mode ?? "test",
  );
  const [publishableKey, setPublishableKey] = React.useState(
    account?.publishable_key ?? "",
  );
  const [cryptoNetwork, setCryptoNetwork] = React.useState(
    account?.crypto_network ?? "",
  );
  const [cryptoWallet, setCryptoWallet] = React.useState(
    account?.crypto_wallet_address ?? "",
  );
  const [instructions, setInstructions] = React.useState(
    row?.instructions ?? "",
  );
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setMessage(null);
    const result = await savePaymentProvider({
      provider,
      displayName: displayName.trim() || PAYMENT_PROVIDER_LABELS[provider],
      isEnabled: enabled,
      mode,
      publishableKey: publishableKey.trim() || null,
      cryptoNetwork: cryptoNetwork.trim() || null,
      cryptoWalletAddress: cryptoWallet.trim() || null,
      instructions: instructions.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      setMessage("Saved.");
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  const showMode = provider === "stripe" || provider === "paypal";

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {PAYMENT_PROVIDER_LABELS[provider]}
          </p>
          <p className="text-xs text-muted-foreground">
            {PAYMENT_PROVIDER_DESCRIPTIONS[provider]}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={enabled}
            disabled={!canManage}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enabled
        </label>
      </div>

      {!operational ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {provider === "stripe"
            ? "Set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) in the environment to accept card payments."
            : "PayPal online checkout is not available yet — the adapter is a placeholder."}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs font-medium">Display name</span>
          <Input
            value={displayName}
            disabled={!canManage}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        {showMode ? (
          <div className="space-y-1">
            <span className="text-xs font-medium">Mode</span>
            <select
              className={FIELD_CLASS}
              value={mode}
              disabled={!canManage}
              aria-label="Provider mode"
              onChange={(event) =>
                setMode(event.target.value === "live" ? "live" : "test")
              }
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </div>
        ) : null}
      </div>

      {provider === "stripe" ? (
        <div className="space-y-1">
          <span className="text-xs font-medium">Publishable key</span>
          <Input
            value={publishableKey}
            disabled={!canManage}
            placeholder="pk_live_..."
            onChange={(event) => setPublishableKey(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The secret key and webhook secret are read from environment
            variables — never stored here.
          </p>
        </div>
      ) : null}

      {provider === "crypto" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs font-medium">Network</span>
            <Input
              value={cryptoNetwork}
              disabled={!canManage}
              placeholder="e.g. USDT (TRC-20)"
              onChange={(event) => setCryptoNetwork(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium">Wallet address</span>
            <Input
              value={cryptoWallet}
              disabled={!canManage}
              onChange={(event) => setCryptoWallet(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {provider === "crypto" || provider === "manual" ? (
        <div className="space-y-1">
          <span className="text-xs font-medium">
            Instructions for guests
          </span>
          <Textarea
            rows={3}
            value={instructions}
            disabled={!canManage}
            placeholder="Shown to the guest when they choose this method."
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>
      ) : null}

      {canManage ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleSave}
          >
            Save
          </Button>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Список настроек платёжных провайдеров организации. */
export function PaymentSettings({
  settings,
  canManage,
}: {
  settings: ProviderSetting[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {settings.map((setting) => (
        <ProviderCard
          key={setting.provider}
          setting={setting}
          canManage={canManage}
        />
      ))}
    </div>
  );
}
