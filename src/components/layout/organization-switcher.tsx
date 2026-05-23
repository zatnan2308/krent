"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { setActiveOrganization } from "@/features/organizations/actions";
import type { OrganizationSummary } from "@/server/organization-context";

interface OrganizationSwitcherProps {
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
}

export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const active = organizations.find((org) => org.id === activeOrganizationId);

  async function handleSelect(organizationId: string) {
    if (organizationId === activeOrganizationId) {
      return;
    }
    await setActiveOrganization(organizationId);
    router.refresh();
  }

  return (
    <Dropdown>
      <DropdownTrigger className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-32 truncate">
          {active?.name ?? "Select organization"}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </DropdownTrigger>
      <DropdownContent align="start" className="w-56">
        <DropdownLabel>Organizations</DropdownLabel>
        <DropdownSeparator />
        {organizations.map((org) => (
          <DropdownItem key={org.id} onSelect={() => handleSelect(org.id)}>
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrganizationId ? (
              <Check className="h-4 w-4" />
            ) : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
