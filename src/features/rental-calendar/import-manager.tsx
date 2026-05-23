"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";

import {
  addImportSource,
  deleteImportSource,
  syncImportSource,
} from "@/features/rental-calendar/actions";
import { PROVIDER_LABELS, PROVIDER_OPTIONS } from "@/features/rental-calendar/constants";
import type { SyncLogView } from "@/features/rental-calendar/queries";
import type {
  IcalImportSource,
  IcalProvider,
} from "@/features/rental-calendar/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ImportManagerProps {
  propertyId: string;
  importSources: IcalImportSource[];
  syncLogs: SyncLogView[];
}

/** Управление источниками импорта iCal, синхронизация и логи. */
export function ImportManager({
  propertyId,
  importSources,
  syncLogs,
}: ImportManagerProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [provider, setProvider] = React.useState<IcalProvider>("airbnb");
  const [url, setUrl] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !url.trim()) {
      setError("Enter a name and feed URL.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await addImportSource({
      propertyId,
      name: name.trim(),
      provider,
      url: url.trim(),
    });
    setPending(false);
    if (result.ok) {
      setName("");
      setUrl("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleSync(sourceId: string) {
    setPending(true);
    setError(null);
    const result = await syncImportSource(sourceId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleDelete(sourceId: string) {
    setPending(true);
    setError(null);
    const result = await deleteImportSource(sourceId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Import calendars</p>
        {importSources.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {importSources.map((source) => (
              <li
                key={source.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {source.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({PROVIDER_LABELS[source.provider]})
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {source.url}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {source.last_synced_at
                      ? `Last synced ${new Date(
                          source.last_synced_at,
                        ).toLocaleString("en-US")}`
                      : "Not synced yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleSync(source.id)}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Sync
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    disabled={pending}
                    aria-label="Delete source"
                    onClick={() => handleDelete(source.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No import calendars connected.
          </p>
        )}
      </div>

      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_160px]">
        <Input
          value={name}
          placeholder="Calendar name"
          aria-label="Calendar name"
          onChange={(event) => setName(event.target.value)}
        />
        <select
          className={FIELD_CLASS}
          value={provider}
          aria-label="Provider"
          onChange={(event) =>
            setProvider(event.target.value as IcalProvider)
          }
        >
          {PROVIDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Input
          className="sm:col-span-2"
          value={url}
          placeholder="iCal feed URL (https://...)"
          aria-label="Feed URL"
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleAdd}
        >
          Add import calendar
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium">Sync logs</p>
        {syncLogs.length > 0 ? (
          <ul className="divide-y rounded-md border text-sm">
            {syncLogs.map((log) => (
              <li key={log.id} className="flex justify-between gap-3 p-2.5">
                <span className="min-w-0">
                  <span className="font-medium">{log.sourceName}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {log.status}
                    {log.status === "success"
                      ? ` (${log.eventsImported} events)`
                      : ""}
                    {log.message ? ` · ${log.message}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No sync history yet.</p>
        )}
      </div>
    </div>
  );
}
