import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PropertyCreateForm } from "@/features/properties/property-create-form";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
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

  const dict = await getServerDictionary();
  const t = dict.dashProperties;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: dict.adminNav.properties, href: ROUTES.dashboard.properties },
          { label: t.newProperty },
        ]}
        title={t.newProperty}
        description={t.newDescription}
      />
      <PropertyCreateForm />
    </div>
  );
}
