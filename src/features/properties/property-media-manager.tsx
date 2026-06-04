"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Star, Trash2, Upload } from "lucide-react";

import {
  deletePropertyMedia,
  reorderPropertyMedia,
  setPropertyMediaCover,
  updatePropertyMediaAlt,
  uploadPropertyMedia,
} from "@/features/properties/media-actions";
import { MEDIA_CATEGORY_OPTIONS } from "@/features/properties/constants";
import type { PropertyMedia } from "@/features/properties/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface PropertyMediaManagerProps {
  propertyId: string;
  media: PropertyMedia[];
}

/** Загрузка и управление изображениями объекта (Supabase Storage). */
export function PropertyMediaManager({
  propertyId,
  media,
}: PropertyMediaManagerProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [category, setCategory] = React.useState("gallery");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setPending(true);
    setError(null);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("propertyId", propertyId);
      formData.set("category", category);
      formData.set("file", file);
      const result = await uploadPropertyMedia(formData);
      if (!result.ok) {
        setError(result.error);
        break;
      }
    }
    setPending(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    router.refresh();
  }

  async function handleDelete(mediaId: string) {
    setPending(true);
    setError(null);
    const result = await deletePropertyMedia(mediaId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleCover(mediaId: string) {
    setPending(true);
    setError(null);
    const result = await setPropertyMediaCover(mediaId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleReorder(mediaId: string, direction: "up" | "down") {
    setPending(true);
    setError(null);
    const result = await reorderPropertyMedia(mediaId, direction);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleAlt(mediaId: string, alt: string) {
    const result = await updatePropertyMediaAlt(mediaId, alt);
    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <label htmlFor="media-category" className="text-sm font-medium">
            Upload as
          </label>
          <select
            id="media-category"
            className={cn(FIELD_CLASS, "w-44")}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {MEDIA_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging ? "border-primary bg-accent" : "border-input",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">Drag and drop images here</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP or AVIF, up to 10MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(event) => void uploadFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Uploading..." : "Select images"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {media.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item, index) => (
            <div key={item.id} className="space-y-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
                <Image
                  src={item.url}
                  alt={item.alt ?? ""}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
                {item.category === "cover" ? (
                  <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                    Cover
                  </span>
                ) : null}
              </div>
              <input
                type="text"
                defaultValue={item.alt ?? ""}
                placeholder="Alt text (SEO)"
                aria-label="Alt text"
                className={cn(FIELD_CLASS, "h-8 text-xs")}
                onBlur={(event) => void handleAlt(item.id, event.target.value)}
              />
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={pending || index === 0}
                    aria-label="Move image up"
                    onClick={() => handleReorder(item.id, "up")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={pending || index === media.length - 1}
                    aria-label="Move image down"
                    onClick={() => handleReorder(item.id, "down")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={pending || item.category === "cover"}
                  onClick={() => handleCover(item.id)}
                >
                  <Star className="mr-1 h-3.5 w-3.5" />
                  Cover
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  disabled={pending}
                  aria-label="Delete image"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No images yet"
          description="Upload photos to showcase this property."
        />
      )}
    </div>
  );
}
