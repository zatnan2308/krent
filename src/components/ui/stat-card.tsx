import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  /** Подпись метрики (отображается капсом, мелким). */
  label: string;
  /** Значение метрики (число или готовый узел). */
  value: ReactNode;
  /** Иконка в правом верхнем углу. */
  icon?: LucideIcon;
  /** Если задан — карточка кликабельна и получает hover-lift. */
  href?: string;
  /** Необязательная подсказка под значением (динамика, период и т.п.). */
  hint?: ReactNode;
  className?: string;
}

/**
 * Премиальная метрик-карточка: крупное tabular-число, иконка-чип, hover-lift
 * для кликабельных. Единый вид KPI на Overview / CRM / Rentals / Analytics.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
  className,
}: StatCardProps) {
  const card = (
    <Card
      className={cn(
        "group h-full p-5",
        href &&
          "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <div className="text-xs text-muted-foreground">{hint}</div>
          ) : null}
        </div>
        {Icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground transition-colors group-hover:text-foreground">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}
