"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Pencil, Trash2, X } from "lucide-react";

import {
  addNearbyPlace,
  addPropertyDocument,
  addPropertyVideo,
  deleteNearbyPlace,
  deletePropertyDocument,
  deletePropertyVideo,
  reorderPropertyDocument,
  reorderPropertyVideo,
  updatePropertyDocument,
  updatePropertyVideo,
  uploadPropertyDocument,
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
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editType, setEditType] = React.useState<
    "tour" | "realtor_review" | "virtual_tour"
  >("tour");

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

  async function handleMove(id: string, direction: "up" | "down") {
    await reorderPropertyVideo(id, direction);
    router.refresh();
  }

  function startEdit(v: VideoRow) {
    setEditId(v.id);
    setEditTitle(v.title ?? "");
    setEditType(
      v.type === "realtor_review" || v.type === "virtual_tour"
        ? v.type
        : "tour",
    );
    setError(null);
  }

  async function handleSaveEdit(id: string) {
    setPending(true);
    setError(null);
    const result = await updatePropertyVideo({
      id,
      title: editTitle.trim() || null,
      type: editType,
    });
    setPending(false);
    if (result.ok) {
      setEditId(null);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">Videos</p>
      {videos.length === 0 ? (
        <p className="text-xs text-muted-foreground">No videos yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {videos.map((v, i) => (
            <li key={v.id} className="rounded-md border p-2">
              {editId === v.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title (optional)"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                      value={editType}
                      onChange={(e) =>
                        setEditType(e.target.value as typeof editType)
                      }
                    >
                      <option value="tour">Tour</option>
                      <option value="virtual_tour">Virtual tour</option>
                      <option value="realtor_review">Realtor review</option>
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => handleSaveEdit(v.id)}
                      aria-label="Save video"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditId(null)}
                      aria-label="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <a href={v.url} target="_blank" rel="noreferrer" className="truncate underline">
                    {v.title ?? v.url}
                  </a>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={i === 0}
                      onClick={() => handleMove(v.id, "up")}
                      aria-label="Move video up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={i === videos.length - 1}
                      onClick={() => handleMove(v.id, "down")}
                      aria-label="Move video down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(v)}
                      aria-label="Edit video"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(v.id)}
                      aria-label="Delete video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editType, setEditType] = React.useState<"brochure" | "other">(
    "brochure",
  );

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

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("propertyId", propertyId);
    formData.set("file", file);
    if (name.trim()) formData.set("name", name.trim());
    formData.set("type", type);
    const result = await uploadPropertyDocument(formData);
    setUploading(false);
    if (result.ok) {
      setFile(null);
      setName("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    await deletePropertyDocument(id);
    router.refresh();
  }

  async function handleMove(id: string, direction: "up" | "down") {
    await reorderPropertyDocument(id, direction);
    router.refresh();
  }

  function startEdit(d: DocumentRow) {
    setEditId(d.id);
    setEditName(d.name);
    setEditType(d.type === "other" ? "other" : "brochure");
    setError(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setPending(true);
    setError(null);
    const result = await updatePropertyDocument({
      id,
      name: editName.trim(),
      type: editType,
    });
    setPending(false);
    if (result.ok) {
      setEditId(null);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">Documents</p>
      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {documents.map((d, i) => (
            <li key={d.id} className="rounded-md border p-2">
              {editId === d.id ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Document name"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                      value={editType}
                      onChange={(e) =>
                        setEditType(e.target.value as typeof editType)
                      }
                    >
                      <option value="brochure">Brochure</option>
                      <option value="other">Other</option>
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => handleSaveEdit(d.id)}
                      aria-label="Save document"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditId(null)}
                      aria-label="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <a href={d.url} target="_blank" rel="noreferrer" className="truncate underline">
                    {d.name}
                  </a>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={i === 0}
                      onClick={() => handleMove(d.id, "up")}
                      aria-label="Move document up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={i === documents.length - 1}
                      onClick={() => handleMove(d.id, "down")}
                      aria-label="Move document down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(d)}
                      aria-label="Edit document"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(d.id)}
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          Upload a file (PDF, image or Word, up to 10MB) — uses the document
          name below, or the file name if left empty.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <Button
            size="sm"
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        Or add by URL
      </p>
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

interface NearbyPlaceRow {
  id: string;
  name: string;
  category: string | null;
  distance: number | null;
  distanceUnit: string | null;
}

export function NearbyPlacesManager({
  propertyId,
  places,
}: {
  propertyId: string;
  places: NearbyPlaceRow[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [distance, setDistance] = React.useState("");
  const [unit, setUnit] = React.useState<"km" | "mi">("km");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    const result = await addNearbyPlace({
      propertyId,
      name: name.trim(),
      category: category.trim() || null,
      distance: distance ? Number(distance) : null,
      distanceUnit: distance ? unit : null,
    });
    setPending(false);
    if (result.ok) {
      setName("");
      setCategory("");
      setDistance("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    await deleteNearbyPlace(id);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">Nearby places</p>
      {places.length === 0 ? (
        <p className="text-xs text-muted-foreground">No nearby places yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {places.map((place) => (
            <li
              key={place.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2"
            >
              <span className="truncate">
                {place.name}
                {place.category ? (
                  <span className="text-muted-foreground"> · {place.category}</span>
                ) : null}
                {place.distance !== null ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {place.distance} {place.distanceUnit ?? "km"}
                  </span>
                ) : null}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleDelete(place.id)}
                aria-label="Delete place"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Place name"
        />
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (school, metro…)"
        />
        <div className="flex gap-2">
          <Input
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="Distance"
            type="number"
            min="0"
            className="flex-1"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as "km" | "mi")}
            aria-label="Distance unit"
            className="h-10 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="km">km</option>
            <option value="mi">mi</option>
          </select>
        </div>
        <Button size="sm" type="button" onClick={handleAdd} disabled={pending}>
          Add place
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
