import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PropertyCreateForm } from "@/features/properties/property-create-form";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "New property",
};

export default async function NewPropertyPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    redirect(ROUTES.dashboard.root);
  }
  if (!hasPermission(context, "properties.create")) {
    redirect(ROUTES.dashboard.properties);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New property</h1>
        <p className="text-sm text-muted-foreground">
          Create the listing, then fill in the details in the editor.
        </p>
      </div>
      <PropertyCreateForm />
    </div>
  );
}
