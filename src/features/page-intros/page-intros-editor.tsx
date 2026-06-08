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
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Other page headings</h2>
        <p className="text-xs text-muted-foreground">
          Intro text (eyebrow, heading, subheading) for the Sell and Agents
          pages. Leave blank to use defaults.
        </p>
      </div>
      {intros.map((entry) => (
        <IntroForm key={entry.pageKey} entry={entry} locale={locale} />
      ))}
    </div>
  );
}

function IntroForm({ entry, locale }: { entry: IntroEntry; locale: string }) {
  const router = useRouter();
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
        <CardTitle className="text-sm">{entry.label}</CardTitle>
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
            setMsg(result.ok ? "Saved." : result.error);
            if (result.ok) router.refresh();
          }}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium">Eyebrow</label>
            <Input
              value={form.eyebrow}
              onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
              placeholder="Sell with us"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Heading</label>
            <Input
              value={form.heading}
              onChange={(e) => setForm({ ...form, heading: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Subheading</label>
            <textarea
              className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.subheading}
              onChange={(e) => setForm({ ...form, subheading: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="submit" disabled={pending}>
              Save
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
