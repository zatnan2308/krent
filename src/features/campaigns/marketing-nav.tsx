"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Campaigns", href: ROUTES.dashboard.marketing, key: "campaigns" },
  {
    label: "Segments",
    href: `${ROUTES.dashboard.marketing}/segments`,
    key: "segments",
  },
  {
    label: "Contacts",
    href: `${ROUTES.dashboard.marketing}/contacts`,
    key: "contacts",
  },
];

/** Навигация раздела маркетинга. */
export function MarketingNav() {
  const pathname = usePathname();

  function isActive(key: string): boolean {
    if (key === "segments") {
      return pathname.startsWith(`${ROUTES.dashboard.marketing}/segments`);
    }
    if (key === "contacts") {
      return pathname.startsWith(`${ROUTES.dashboard.marketing}/contacts`);
    }
    return (
      pathname === ROUTES.dashboard.marketing ||
      pathname.startsWith(`${ROUTES.dashboard.marketing}/campaigns`)
    );
  }

  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            isActive(item.key)
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
