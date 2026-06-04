"use client";

import Link from "next/link";
import { ExternalLink, LogOut, Menu, User } from "lucide-react";

import {
  NotificationsBell,
  type NotificationItem,
} from "@/components/layout/notifications-bell";
import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { signOut } from "@/features/auth/actions";
import { ROUTES } from "@/lib/constants/routes";
import type { OrganizationSummary } from "@/server/organization-context";

interface AppTopbarProps {
  variant: "dashboard" | "super-admin";
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
  userEmail: string;
  userName?: string | null;
  avatarUrl?: string | null;
  notifications?: NotificationItem[];
  publicSiteUrl?: string | null;
  onMenuClick: () => void;
}

export function AppTopbar({
  variant,
  organizations,
  activeOrganizationId,
  userEmail,
  userName,
  avatarUrl,
  notifications,
  publicSiteUrl,
  onMenuClick,
}: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/65 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {variant === "dashboard" ? (
        <OrganizationSwitcher
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
        />
      ) : (
        <span className="rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground">
          Platform Admin
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        {publicSiteUrl ? (
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <a href={publicSiteUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> View site
            </a>
          </Button>
        ) : null}
        <NotificationsBell items={notifications ?? []} />
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={userName ?? userEmail}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end" className="w-56">
            <DropdownLabel className="font-medium">
              {userName ?? "Account"}
              <p className="truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </p>
            </DropdownLabel>
            <DropdownSeparator />
            {variant === "dashboard" ? (
              <DropdownItem asChild>
                <Link href={ROUTES.dashboard.settings}>Profile & settings</Link>
              </DropdownItem>
            ) : null}
            <DropdownSeparator />
            <form action={signOut}>
              <button
                type="submit"
                className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
