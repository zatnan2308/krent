"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: ROUTES.dashboard.crm, key: "overview" },
  { href: ROUTES.dashboard.crmLeads, key: "leads" },
  { href: ROUTES.dashboard.crmContacts, key: "contacts" },
  { href: ROUTES.dashboard.crmDeals, key: "deals" },
  { href: ROUTES.dashboard.crmTasks, key: "tasks" },
] as const;

/** Поднавигация раздела CRM. */
export function CrmNav() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const labels: Record<(typeof LINKS)[number]["key"], string> = {
    overview: dict.adminNav.overview,
    leads: dict.dashCrm.navLeads,
    contacts: dict.dashCrm.navContacts,
    deals: dict.dashCrm.navDeals,
    tasks: dict.dashCrm.navTasks,
  };

  return (
    <nav className="flex flex-wrap items-center gap-x-1 border-b">
      {LINKS.map((link) => {
        const active =
          link.href === ROUTES.dashboard.crm
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-all after:content-['']",
              active
                ? "text-foreground after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent",
            )}
          >
            {labels[link.key]}
          </Link>
        );
      })}
    </nav>
  );
}
