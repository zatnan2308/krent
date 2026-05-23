import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Строит URL для конкретной страницы. */
  getHref: (page: number) => string;
  className?: string;
}

/** Возвращает номера страниц с заглушками "ellipsis" для пропусков. */
function getPageItems(
  page: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  const items: Array<number | "ellipsis"> = [];
  const siblings = 1;

  for (let i = 1; i <= totalPages; i += 1) {
    const isEdge = i === 1 || i === totalPages;
    const isNearCurrent = i >= page - siblings && i <= page + siblings;

    if (isEdge || isNearCurrent) {
      items.push(i);
    } else if (items[items.length - 1] !== "ellipsis") {
      items.push("ellipsis");
    }
  }

  return items;
}

export function Pagination({
  page,
  totalPages,
  getHref,
  className,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = getPageItems(page, totalPages);
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <Link
        href={getHref(Math.max(1, page - 1))}
        aria-disabled={isFirst}
        tabIndex={isFirst ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-9 w-9",
          isFirst && "pointer-events-none opacity-50",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Link>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
            aria-hidden
          >
            &#8230;
          </span>
        ) : (
          <Link
            key={item}
            href={getHref(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: item === page ? "default" : "outline",
                size: "icon",
              }),
              "h-9 w-9",
            )}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={getHref(Math.min(totalPages, page + 1))}
        aria-disabled={isLast}
        tabIndex={isLast ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-9 w-9",
          isLast && "pointer-events-none opacity-50",
        )}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Link>
    </nav>
  );
}
