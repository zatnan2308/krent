"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updatePageIntro } from "@/features/page-intros/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

interface IntroValue {
  eyebrow: string | null;
  heading: string | null;
  subheading: string | null;
}

interface IntroEntry {
  pageKey: string;
  label: string;
  value: IntroValue;
}

export function PageIntrosEditor({
  intros,
  locale,
}: {
  intros: IntroEntry[];
  locale: string;
}) {
  const { dict } = useI18n();
  const t = dict.aboutEditor;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t.introsTitle}</h2>
        <p className="text-xs text-muted-foreground">{t.introsHint}</p>
      </div>
      {intros.map((entry) => (
        <IntroForm key={entry.pageKey} entry={entry} locale={locale} />
      ))}
    </div>
  );
}

function IntroForm({ entry, locale }: { entry: IntroEntry; locale: string }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.aboutEditor;
  const pageLabel =
    entry.pageKey === "sell"
      ? t.pageSell
      : entry.pageKey === "agents"
        ? t.pageAgents
        : entry.label;
  const [form, setForm] = React.useState({
    eyebrow: entry.value.eyebrow ?? "",
    heading: entry.value.heading ?? "",
    subheading: entry.value.subheading ?? "",
  });
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{pageLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = await updatePageIntro(
              {
                pageKey: entry.pageKey,
                eyebrow: form.eyebrow || null,
                heading: form.heading || null,
                subheading: form.subheading || null,
              },
              locale,
            );
            setPending(false);
            setMsg(result.ok ? t.saved : result.error);
            if (result.ok) router.refresh();
          }}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.eyebrow}</label>
            <Input
              value={form.eyebrow}
              onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
              placeholder="Sell with us"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.heading}</label>
            <Input
              value={form.heading}
              onChange={(e) => setForm({ ...form, heading: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.subheading}</label>
            <textarea
              className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.subheading}
              onChange={(e) => setForm({ ...form, subheading: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="submit" disabled={pending}>
              {t.save}
            </Button>
            {msg ? (
              <span className="text-xs text-muted-foreground">{msg}</span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
