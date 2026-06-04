import type { Metadata } from "next";

import { AmenitiesManager } from "@/features/properties/amenities-manager";
import { getAmenityCatalog } from "@/features/properties/dashboard-queries";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Amenities",
};

export default async function AmenitiesPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }

  const catalog = await getAmenityCatalog(context.organization.id);
  const canManage = hasPermission(context, "properties.manage_all");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Properties", href: ROUTES.dashboard.properties },
          { label: "Amenities" },
        ]}
        title="Amenities"
        description={`Amenity catalog used across the listings of ${context.organization.name}.`}
      />
      <AmenitiesManager catalog={catalog} canManage={canManage} />
    </div>
  );
}
