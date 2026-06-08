"use client";

import * as React from "react";

import { getPortalDocumentUrl } from "@/features/portal/document-actions";
import type { ClientDocumentItem } from "@/features/portal/queries";
import { Button } from "@/components/ui/button";

/** Человекочитаемый размер файла. */
function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** Список документов клиента в портале со скачиванием по signed URL. */
export function PortalDocuments({
  documents,
}: {
  documents: ClientDocumentItem[];
}) {
  const [error, setError] = React.useState<string | null>(null);

  async function handleDownload(documentId: string) {
    setError(null);
    const result = await getPortalDocumentUrl(documentId);
    if (result.ok) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      setError(result.error);
    }
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents have been shared with you yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <ul className="divide-y">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 py-2"
          >
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => void handleDownload(doc.id)}
                className="truncate text-left text-sm font-medium hover:underline"
              >
                {doc.fileName}
              </button>
              <p className="text-xs text-muted-foreground">
                {[
                  formatBytes(doc.sizeBytes),
                  new Date(doc.createdAt).toLocaleDateString("en-US"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDownload(doc.id)}
            >
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
