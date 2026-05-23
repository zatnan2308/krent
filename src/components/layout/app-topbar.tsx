"use client";

import { Bell, LogOut, Menu, User } from "lucide-react";

import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { signOut } from "@/features/auth/actions";
import type { OrganizationSummary } from "@/server/organization-context";

interface AppTopbarProps {
  variant: "dashboard" | "super-admin";
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
  userEmail: string;
  onMenuClick: () => void;
}

export function AppTopbar({
  variant,
  organizations,
  activeOrganizationId,
  userEmail,
  onMenuClick,
}: AppTopbarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b bg-background px-4 lg:px-6">
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
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account">
              <User className="h-5 w-5" />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end" className="w-56">
            <DropdownLabel className="truncate font-normal text-muted-foreground">
              {userEmail}
            </DropdownLabel>
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
