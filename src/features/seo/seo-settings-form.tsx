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
export function SeoSettingsForm({ initial }: { initial: SeoSettingsInput }) {
  const router = useRouter();
  const [form, setForm] = React.useState<SeoSettingsInput>({ ...initial });
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

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
