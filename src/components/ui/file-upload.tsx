"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { cn } from "@/lib/utils";

interface FileUploadProps {
  label?: string;
  hint?: string;
  className?: string;
}

/**
 * Placeholder-компонент загрузки файлов: показывает drop-зону и реагирует на
 * перетаскивание. Реальная загрузка в Supabase Storage подключается позже.
 */
export function FileUpload({
  label = "Click to upload or drag and drop",
  hint = "PNG, JPG or PDF, up to 10MB",
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragging ? "border-primary bg-accent" : "border-input",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Upload className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
