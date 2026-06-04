import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** Заголовок страницы (h1). */
  title: string;
  /** Необязательное описание под заголовком. */
  description?: string;
  /** Хлебные крошки; последняя считается текущей страницей. */
  breadcrumbs?: Breadcrumb[];
  /** Кнопки/действия справа (на мобиле переносятся вниз). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Единый заголовок страниц дашборда: крошки + заголовок + описание + слот
 * действий. Заменяет ad-hoc `<h1>` на каждой странице, выравнивает отступы и
 * даёт мягкую анимацию появления. Серверо-безопасен (без хуков).
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("animate-fade-in-up space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span
                key={`${crumb.label}-${index}`}
                className="flex items-center gap-1.5"
              >
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn(isLast && "font-medium text-foreground")}>
                    {crumb.label}
                  </span>
                )}
                {!isLast ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                ) : null}
              </span>
            );
          })}
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
