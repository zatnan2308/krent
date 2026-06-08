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

export function LegalEditor({
  docs,
  locale,
}: {
  docs: DocEntry[];
  locale: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Legal pages</h2>
        <p className="text-xs text-muted-foreground">
          Privacy, Terms and Cookies. Use <code>## Heading</code> for sections
          and <code>- item</code> for list bullets. Leave blank to use the
          built-in defaults.
        </p>
      </div>
      {docs.map((doc) => (
        <LegalForm key={doc.docKey} entry={doc} locale={locale} />
      ))}
    </div>
  );
}

function LegalForm({ entry, locale }: { entry: DocEntry; locale: string }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(entry.value.title ?? "");
  const [body, setBody] = React.useState(entry.value.body ?? "");
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
            const result = await updateLegalDocument(
              {
                docKey: entry.docKey,
                title: title || null,
                body: body || null,
              },
              locale,
            );
            setPending(false);
            setMsg(result.ok ? "Saved." : result.error);
            if (result.ok) router.refresh();
          }}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={entry.label}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Body</label>
            <textarea
              className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"## Section\nParagraph text…\n- bullet one\n- bullet two"}
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
