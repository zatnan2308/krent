"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { importContactsCsv } from "@/features/crm/contacts-import-actions";
import { Button } from "@/components/ui/button";

export function ContactsCsvImport() {
  const router = useRouter();
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
      setMessage(`Imported ${result.inserted}, skipped ${result.skipped}.`);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <p className="font-semibold">Import contacts from CSV</p>
      <p className="text-xs text-muted-foreground">
        Header row must include <code>name</code> (or <code>full_name</code>);
        optional <code>email</code> and <code>phone</code>. Rows with a
        duplicate email are skipped.
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
          Choose CSV
        </Button>
        {message ? (
          <span className="text-xs text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </div>
  );
}
