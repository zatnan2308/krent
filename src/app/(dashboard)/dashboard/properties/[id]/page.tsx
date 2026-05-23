import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getAmenityCatalog,
  getPropertyForEdit,
} from "@/features/properties/dashboard-queries";
import { PropertyForm } from "@/features/properties/property-form";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
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

  const [property, amenityCatalog] = await Promise.all([
    getPropertyForEdit(
      context.organization.id,
      params.id,
      context.organization.default_language,
    ),
    getAmenityCatalog(context.organization.id),
  ]);
  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.property.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit listing details, pricing, media and location.
          </p>
        </div>
        <Link
          href={`${ROUTES.dashboard.properties}/${params.id}/calendar`}
          className={buttonVariants({ variant: "outline" })}
        >
          Rental calendar
        </Link>
      </div>
      <PropertyForm
        initial={property}
        amenityCatalog={amenityCatalog}
        currentUserId={context.user.id}
        canDelete={hasPermission(context, "properties.delete")}
      />
    </div>
  );
}
