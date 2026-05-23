"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface GalleryImage {
  url: string;
  alt: string | null;
}

export function PropertyGalleryLightbox({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const close = React.useCallback(() => setOpenIndex(null), []);

  React.useEffect(() => {
    if (openIndex === null) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenIndex(null);
      } else if (event.key === "ArrowLeft") {
        setOpenIndex((idx) =>
          idx === null ? null : (idx - 1 + images.length) % images.length,
        );
      } else if (event.key === "ArrowRight") {
        setOpenIndex((idx) =>
          idx === null ? null : (idx + 1) % images.length,
        );
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openIndex, images.length]);

  if (images.length === 0) return null;
  const current = openIndex !== null ? images[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={`${image.url}-${index}`}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted"
            aria-label="Open image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt ?? ""}
              loading="lazy"
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>

      {current ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white"
            aria-label="Close"
            onClick={close}
          >
            <X className="h-5 w-5" />
          </Button>
          {images.length > 1 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white"
                aria-label="Previous"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex(
                    (idx) =>
                      idx === null
                        ? null
                        : (idx - 1 + images.length) % images.length,
                  );
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white"
                aria-label="Next"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((idx) =>
                    idx === null ? null : (idx + 1) % images.length,
                  );
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt ?? ""}
            className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
