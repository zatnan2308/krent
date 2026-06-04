import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level скелет дашборда — показывается во время server-рендера любой
 * страницы дашборда при навигации (Suspense-граница сегмента). Универсальный
 * каркас: заголовок + ряд метрик + крупный блок.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[88px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
