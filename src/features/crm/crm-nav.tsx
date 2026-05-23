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
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {LINKS.map((link) => {
        const active =
          link.href === ROUTES.dashboard.crm
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
