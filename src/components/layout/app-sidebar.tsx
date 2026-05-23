"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

import {
  dashboardNav,
  superAdminNav,
  type NavItem,
} from "@/components/layout/nav-config";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  variant: "dashboard" | "super-admin";
  onNavigate?: () => void;
}

export function AppSidebar({ variant, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const items: NavItem[] =
    variant === "super-admin" ? superAdminNav : dashboardNav;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <Link href={ROUTES.dashboard.root}>{DEFAULT_BRANDING.logoText}</Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);
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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
