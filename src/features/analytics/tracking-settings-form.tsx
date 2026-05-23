"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { saveTrackingSettings } from "@/features/analytics/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface InitialSettings {
  ga4MeasurementId: string;
  gtmId: string;
  ga4Enabled: boolean;
  metaPixelId: string;
  metaCapiToken: string;
  metaPixelEnabled: boolean;
  googleAdsConversionId: string;
  /** JSON-строка вида {"lead_form_submit":"abc123"}. */
  googleAdsLabels: string;
  consentModeEnabled: boolean;
}

/** Форма настроек tracking-интеграций: GA4/GTM, Meta Pixel, Google Ads. */
export function TrackingSettingsForm({
  initial,
}: {
  initial: InitialSettings;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<InitialSettings>(initial);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  function update<K extends keyof InitialSettings>(
    key: K,
    value: InitialSettings[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setPending(true);
    setMessage(null);

    let labels: Record<string, string>;
    try {
      const parsed = JSON.parse(state.googleAdsLabels || "{}");
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error("not object");
      }
      labels = {};
      for (const [key, value] of Object.entries(
        parsed as Record<string, unknown>,
      )) {
        if (typeof value === "string") {
          labels[key] = value;
        }
      }
    } catch {
      setPending(false);
      setMessage(
        'Google Ads labels must be a JSON object like {"lead_form_submit":"abc123"}.',
      );
      return;
    }

    const result = await saveTrackingSettings({
      ga4MeasurementId: state.ga4MeasurementId.trim() || null,
      gtmId: state.gtmId.trim() || null,
      ga4Enabled: state.ga4Enabled,
      metaPixelId: state.metaPixelId.trim() || null,
      metaCapiToken: state.metaCapiToken.trim() || null,
      metaPixelEnabled: state.metaPixelEnabled,
      googleAdsConversionId: state.googleAdsConversionId.trim() || null,
      googleAdsLabels: labels,
      consentModeEnabled: state.consentModeEnabled,
    });
    setPending(false);
    if (result.ok) {
      setMessage("Saved.");
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-semibold">Google Analytics 4 &amp; GTM</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">GA4 Measurement ID</label>
            <Input
              value={state.ga4MeasurementId}
              placeholder="G-XXXXXXXXXX"
              onChange={(event) =>
                update("ga4MeasurementId", event.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">GTM Container ID</label>
            <Input
              value={state.gtmId}
              placeholder="GTM-XXXXXX"
              onChange={(event) => update("gtmId", event.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={state.ga4Enabled}
            onChange={(event) => update("ga4Enabled", event.target.checked)}
          />
          Enable GA4 on the public site
        </label>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-semibold">Meta Pixel</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Pixel ID</label>
            <Input
              value={state.metaPixelId}
              placeholder="1234567890"
              onChange={(event) =>
                update("metaPixelId", event.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              CAPI token (placeholder)
            </label>
            <Input
              type="password"
              value={state.metaCapiToken}
              placeholder="EAAB..."
              onChange={(event) =>
                update("metaCapiToken", event.target.value)
              }
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={state.metaPixelEnabled}
            onChange={(event) =>
              update("metaPixelEnabled", event.target.checked)
            }
          />
          Enable Meta Pixel on the public site
        </label>
        <p className="text-xs text-muted-foreground">
          CAPI token is stored but not yet used — server-side Conversions
          API is wired in a future stage.
        </p>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-semibold">Google Ads conversions</p>
        <div className="space-y-1">
          <label className="text-xs font-medium">Conversion ID</label>
          <Input
            value={state.googleAdsConversionId}
            placeholder="AW-123456789 (digits only)"
            onChange={(event) =>
              update("googleAdsConversionId", event.target.value)
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">
            Conversion labels (JSON)
          </label>
          <Textarea
            rows={4}
            className="font-mono text-xs"
            value={state.googleAdsLabels}
            placeholder='{"lead_form_submit":"abc123","payment_completed":"def456"}'
            onChange={(event) =>
              update("googleAdsLabels", event.target.value)
            }
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-semibold">Consent (placeholder)</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={state.consentModeEnabled}
            onChange={(event) =>
              update("consentModeEnabled", event.target.checked)
            }
          />
          Initialise Google Consent Mode v2 defaults
        </label>
        <p className="text-xs text-muted-foreground">
          Consent banner UI is not built yet — this flag only injects the
          default <code>gtag(&apos;consent&apos;, &apos;default&apos;, ...)</code> call.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={handleSave}>
          Save tracking settings
        </Button>
        {message ? (
          <span className="text-sm text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </div>
  );
}
