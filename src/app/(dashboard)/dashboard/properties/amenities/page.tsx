import type { Metadata } from "next";

import { AmenitiesManager } from "@/features/properties/amenities-manager";
import { getAmenityCatalog } from "@/features/properties/dashboard-queries";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Amenities</h1>
        <p className="text-sm text-muted-foreground">
          Amenity catalog used across the listings of{" "}
          {context.organization.name}.
        </p>
      </div>
      <AmenitiesManager catalog={catalog} canManage={canManage} />
    </div>
  );
}
