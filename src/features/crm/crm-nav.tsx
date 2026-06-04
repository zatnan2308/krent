"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: ROUTES.dashboard.crm, label: "Overview" },
  { href: ROUTES.dashboard.crmLeads, label: "Leads" },
  { href: ROUTES.dashboard.crmContacts, label: "Contacts" },
  { href: ROUTES.dashboard.crmDeals, label: "Deals" },
  { href: ROUTES.dashboard.crmTasks, label: "Tasks" },
];

/** Поднавигация раздела CRM. */
export function CrmNav() {
  const pathname = usePathname();

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
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
