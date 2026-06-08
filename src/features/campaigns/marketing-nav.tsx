"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: ROUTES.dashboard.marketing, key: "campaigns" },
  { href: `${ROUTES.dashboard.marketing}/segments`, key: "segments" },
  { href: `${ROUTES.dashboard.marketing}/contacts`, key: "contacts" },
] as const;

/** Навигация раздела маркетинга. */
export function MarketingNav() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const labels: Record<(typeof ITEMS)[number]["key"], string> = {
    campaigns: dict.dashMarketing.navCampaigns,
    segments: dict.dashMarketing.navSegments,
    contacts: dict.dashMarketing.navContacts,
  };

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
    <nav className="flex flex-wrap items-center gap-x-1 border-b">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={isActive(item.key) ? "page" : undefined}
          className={cn(
            "relative px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-all after:content-['']",
            isActive(item.key)
              ? "text-foreground after:bg-primary"
              : "text-muted-foreground hover:text-foreground after:bg-transparent",
          )}
        >
          {labels[item.key]}
        </Link>
      ))}
    </nav>
  );
}
