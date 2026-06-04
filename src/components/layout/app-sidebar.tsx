"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

import {
  dashboardNavSections,
  superAdminNav,
  type NavItem,
  type NavSection,
} from "@/components/layout/nav-config";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  variant: "dashboard" | "super-admin";
  onNavigate?: () => void;
  badges?: Record<string, number>;
  /** Права текущего пользователя — для фильтрации пунктов dashboard. */
  permissions?: string[];
  /** Super-admin видит все пункты независимо от прав. */
  isSuperAdmin?: boolean;
}

export function AppSidebar({
  variant,
  onNavigate,
  badges,
  permissions = [],
  isSuperAdmin = false,
}: AppSidebarProps) {
  const pathname = usePathname();

  // Видим ли пункт: нет требования к праву, super-admin, либо право есть.
  const canSee = (item: NavItem): boolean =>
    !item.permission || isSuperAdmin || permissions.includes(item.permission);

  // Для dashboard — секции с фильтрацией; для super-admin — плоский список.
  const sections: NavSection[] =
    variant === "super-admin"
      ? [{ label: null, items: superAdminNav }]
      : dashboardNavSections
          .map((section) => ({
            ...section,
            items: section.items.filter(canSee),
          }))
          .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <Link href={ROUTES.dashboard.root}>{DEFAULT_BRANDING.logoText}</Link>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {sections.map((section, sectionIdx) => (
          <div key={section.label ?? `section-${sectionIdx}`} className="space-y-1">
            {section.label ? (
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {badges && badges[item.href] ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
                      {badges[item.href]}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
