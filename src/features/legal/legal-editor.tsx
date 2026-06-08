"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateLegalDocument } from "@/features/legal/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type DocKey = "privacy" | "terms" | "cookies";

interface DocValue {
  title: string | null;
  body: string | null;
}

interface DocEntry {
  docKey: DocKey;
  label: string;
  value: DocValue;
}

function docLabel(t: Dictionary["aboutEditor"], docKey: DocKey): string {
  return docKey === "privacy"
    ? t.docPrivacy
    : docKey === "terms"
      ? t.docTerms
      : t.docCookies;
}

export function LegalEditor({
  docs,
  locale,
}: {
  docs: DocEntry[];
  locale: string;
}) {
  const { dict } = useI18n();
  const t = dict.aboutEditor;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t.legalTitle}</h2>
        <p className="text-xs text-muted-foreground">{t.legalHint}</p>
      </div>
      {docs.map((doc) => (
        <LegalForm key={doc.docKey} entry={doc} locale={locale} />
      ))}
    </div>
  );
}

function LegalForm({ entry, locale }: { entry: DocEntry; locale: string }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.aboutEditor;
  const label = docLabel(t, entry.docKey);
  const [title, setTitle] = React.useState(entry.value.title ?? "");
  const [body, setBody] = React.useState(entry.value.body ?? "");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = await updateLegalDocument(
              {
                docKey: entry.docKey,
                title: title || null,
                body: body || null,
              },
              locale,
            );
            setPending(false);
            setMsg(result.ok ? t.saved : result.error);
            if (result.ok) router.refresh();
          }}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.title}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={label}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{t.body}</label>
            <textarea
              className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"## Section\nParagraph text…\n- bullet one\n- bullet two"}
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
