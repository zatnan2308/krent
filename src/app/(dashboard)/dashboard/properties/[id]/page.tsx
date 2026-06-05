import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getOrgAgents } from "@/features/crm/queries";
import {
  getAmenityCatalog,
  getPropertyForEdit,
} from "@/features/properties/dashboard-queries";
import { PropertyForm } from "@/features/properties/property-form";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Edit property",
};

export default async function EditPropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    redirect(ROUTES.dashboard.root);
  }

  const canManageAll = hasPermission(context, "properties.manage_all");
  const [property, amenityCatalog, agents] = await Promise.all([
    getPropertyForEdit(
      context.organization.id,
      params.id,
      context.organization.default_language,
    ),
    getAmenityCatalog(context.organization.id),
    canManageAll
      ? getOrgAgents(context.organization.id)
      : Promise.resolve([]),
  ]);
  if (!property) {
    notFound();
  }

  // Доп. сущности объекта грузим здесь и раскладываем по вкладкам формы:
  // видео/документы → Media, ближайшие места → Location.
  const admin = createAdminClient();
  const [{ data: videos }, { data: docs }, { data: places }] =
    await Promise.all([
      admin
        .from("property_videos")
        .select("id, url, title, type")
        .eq("property_id", params.id)
        .order("sort_order"),
      admin
        .from("property_documents")
        .select("id, name, url, type")
        .eq("property_id", params.id)
        .order("sort_order"),
      admin
        .from("nearby_places")
        .select("id, name, category, distance, distance_unit")
        .eq("property_id", params.id)
        .order("sort_order"),
    ]);
  const nearbyPlaces = (places ?? []).map((place) => ({
    id: place.id,
    name: place.name,
    category: place.category,
    distance: place.distance,
    distanceUnit: place.distance_unit,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Properties", href: ROUTES.dashboard.properties },
          { label: property.property.title },
        ]}
        title={property.property.title}
        description="Edit listing details, pricing, media and location."
        actions={
          <>
            <Link
              href={`/${context.organization.default_language}/properties/${property.property.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              View public page
            </Link>
            <Link
              href={`${ROUTES.dashboard.properties}/${params.id}/calendar`}
              className={buttonVariants({ variant: "outline" })}
            >
              Rental calendar
            </Link>
          </>
        }
      />
      <PropertyForm
        initial={property}
        amenityCatalog={amenityCatalog}
        currentUserId={context.user.id}
        canDelete={hasPermission(context, "properties.delete")}
        agents={agents}
        canManageAll={canManageAll}
        videos={videos ?? []}
        documents={docs ?? []}
        nearbyPlaces={nearbyPlaces}
      />
    </div>
  );
}
