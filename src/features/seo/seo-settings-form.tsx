"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  updateSeoSettings,
  type SeoSettingsInput,
} from "@/features/seo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TEXTAREA_CLASS =
  "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {hint ? (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

/** Редактор глобальных SEO-настроек сайта. */
export function SeoSettingsForm({
  initial,
  siteHost,
}: {
  initial: SeoSettingsInput;
  siteHost?: string;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<SeoSettingsInput>({ ...initial });
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const host = siteHost || "your-domain.com";
  const previewTitle =
    `${form.defaultTitle}${form.titleSuffix}`.trim() || "Your page title";
  const previewDescription =
    form.defaultDescription.trim() ||
    "Your page description appears here — keep it under ~160 characters for search results.";

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateSeoSettings(form);
        setPending(false);
        setMessage(result.ok ? "SEO settings saved." : (result.error ?? null));
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Default title"
          hint="Used when a page has no SEO title."
        >
          <Input
            value={form.defaultTitle}
            onChange={(e) => setForm({ ...form, defaultTitle: e.target.value })}
          />
        </Field>
        <Field
          label="Title suffix"
          hint="Appended to titles, e.g. “ · Krent”."
        >
          <Input
            value={form.titleSuffix}
            onChange={(e) => setForm({ ...form, titleSuffix: e.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Default description"
        hint="Fallback meta description for pages without one."
      >
        <textarea
          className={TEXTAREA_CLASS}
          value={form.defaultDescription}
          onChange={(e) =>
            setForm({ ...form, defaultDescription: e.target.value })
          }
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Default OG image URL"
          hint="Social preview image when a page has none."
        >
          <Input
            value={form.defaultOgImageUrl}
            onChange={(e) =>
              setForm({ ...form, defaultOgImageUrl: e.target.value })
            }
          />
        </Field>
        <Field
          label="Google site verification"
          hint="Content of the google-site-verification meta tag."
        >
          <Input
            value={form.googleSiteVerification}
            onChange={(e) =>
              setForm({ ...form, googleSiteVerification: e.target.value })
            }
          />
        </Field>
      </div>

      <Field
        label="robots.txt"
        hint="Custom robots.txt body. Leave blank for the default."
      >
        <textarea
          className={`${TEXTAREA_CLASS} font-mono`}
          rows={4}
          value={form.robotsTxt}
          onChange={(e) => setForm({ ...form, robotsTxt: e.target.value })}
        />
      </Field>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Live preview (defaults used when a page sets nothing of its own)
        </p>

        {/* Google-сниппет */}
        <div className="rounded-md border bg-background p-3">
          <p className="truncate text-xs text-muted-foreground">
            {host} › …
          </p>
          <p className="truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">
            {previewTitle}
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {previewDescription}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Title {previewTitle.length}/60 · Description{" "}
            {form.defaultDescription.trim().length}/160
          </p>
        </div>

        {/* OG / соцкарточка */}
        <div className="max-w-md overflow-hidden rounded-md border bg-background">
          {form.defaultOgImageUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.defaultOgImageUrl}
              alt="Open Graph preview"
              className="aspect-[1.91/1] w-full bg-muted object-cover"
            />
          ) : (
            <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              No OG image set
            </div>
          )}
          <div className="space-y-0.5 border-t p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {host}
            </p>
            <p className="truncate text-sm font-medium">{previewTitle}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {previewDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save SEO settings"}
        </Button>
        {message ? (
          <span className="text-xs text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </form>
  );
}
