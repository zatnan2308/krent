"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { importContactsCsv } from "@/features/crm/contacts-import-actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

export function ContactsCsvImport() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setPending(true);
    setMessage(null);
    const text = await file.text();
    const result = await importContactsCsv(text);
    setPending(false);
    if (result.ok) {
      setMessage(
        t.csvImported
          .replace("{inserted}", String(result.inserted))
          .replace("{skipped}", String(result.skipped)),
      );
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <p className="font-semibold">{t.csvTitle}</p>
      <p className="text-xs text-muted-foreground">
        {t.csvHelpInclude} <code>name</code> ({t.csvHelpOr}{" "}
        <code>full_name</code>){t.csvHelpOptional} <code>email</code>{" "}
        {t.csvHelpAnd} <code>phone</code>
        {t.csvHelpSkip}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {t.chooseCsv}
        </Button>
        {message ? (
          <span className="text-xs text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </div>
  );
}
