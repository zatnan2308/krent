import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Скелет-плейсхолдер для состояний загрузки с мягкой shimmer-анимацией.
 * Размер задаётся через className (например, `h-4 w-32`).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-muted/70", className)}
      {...props}
    >
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export { Skeleton };
