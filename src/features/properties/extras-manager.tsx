"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  addPropertyDocument,
  addPropertyVideo,
  deletePropertyDocument,
  deletePropertyVideo,
} from "@/features/properties/extras-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VideoRow {
  id: string;
  url: string;
  title: string | null;
  type: string;
}

interface DocumentRow {
  id: string;
  name: string;
  url: string;
  type: string;
}

export function VideosManager({
  propertyId,
  videos,
}: {
  propertyId: string;
  videos: VideoRow[];
}) {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<"tour" | "realtor_review" | "virtual_tour">(
    "tour",
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    if (!url.trim()) return;
    setPending(true);
    setError(null);
    const result = await addPropertyVideo({
      propertyId,
      url: url.trim(),
      title: title.trim() || null,
      type,
    });
    setPending(false);
    if (result.ok) {
      setUrl("");
      setTitle("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    await deletePropertyVideo(id);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">Videos</p>
      {videos.length === 0 ? (
        <p className="text-xs text-muted-foreground">No videos yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <a href={v.url} target="_blank" rel="noreferrer" className="truncate underline">
                {v.title ?? v.url}
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleDelete(v.id)}
                aria-label="Delete video"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="tour">Tour</option>
          <option value="virtual_tour">Virtual tour</option>
          <option value="realtor_review">Realtor review</option>
        </select>
        <Button size="sm" type="button" onClick={handleAdd} disabled={pending}>
          Add video
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function DocumentsManager({
  propertyId,
  documents,
}: {
  propertyId: string;
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [type, setType] = React.useState<"brochure" | "other">("brochure");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !url.trim()) return;
    setPending(true);
    setError(null);
    const result = await addPropertyDocument({
      propertyId,
      name: name.trim(),
      url: url.trim(),
      type,
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

  async function handleDelete(id: string) {
    await deletePropertyDocument(id);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">Documents</p>
      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <a href={d.url} target="_blank" rel="noreferrer" className="truncate underline">
                {d.name}
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleDelete(d.id)}
                aria-label="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Document name" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="brochure">Brochure</option>
          <option value="other">Other</option>
        </select>
        <Button size="sm" type="button" onClick={handleAdd} disabled={pending}>
          Add document
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
