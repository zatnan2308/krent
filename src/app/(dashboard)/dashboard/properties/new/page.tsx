import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PropertyCreateForm } from "@/features/properties/property-create-form";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        breadcrumbs={[
          { label: "Properties", href: ROUTES.dashboard.properties },
          { label: "New property" },
        ]}
        title="New property"
        description="Create the listing, then fill in the details in the editor."
      />
      <PropertyCreateForm />
    </div>
  );
}
