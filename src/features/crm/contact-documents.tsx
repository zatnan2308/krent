"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  deleteClientDocument,
  getAgentDocumentUrl,
  uploadClientDocument,
} from "@/features/portal/document-actions";
import type { ClientDocumentItem } from "@/features/portal/queries";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

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

interface ContactDocumentsProps {
  contactId: string;
  documents: ClientDocumentItem[];
  canManage: boolean;
}

/** Документы контакта: загрузка агентом, список, скачивание, удаление. */
export function ContactDocuments({
  contactId,
  documents,
  canManage,
}: ContactDocumentsProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setPending(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("contactId", contactId);
    formData.set("file", file);
    const result = await uploadClientDocument(formData);
    setPending(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleDownload(documentId: string) {
    const result = await getAgentDocumentUrl(documentId);
    if (result.ok) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      setMessage(result.error);
    }
  }

  async function handleDelete(documentId: string) {
    if (!window.confirm(t.docDeleteConfirm)) return;
    setPending(true);
    setMessage(null);
    const result = await deleteClientDocument(documentId);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) =>
              void handleFile(event.target.files?.[0] ?? null)
            }
          />
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? t.docUploading : t.docUpload}
          </Button>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
      ) : null}

      {documents.length > 0 ? (
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
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownload(doc.id)}
                >
                  {t.docDownload}
                </Button>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => void handleDelete(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    {t.docDelete}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.docEmpty}</p>
      )}
    </div>
  );
}
