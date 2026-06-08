import type { Metadata } from "next";

import { AmenitiesManager } from "@/features/properties/amenities-manager";
import { getAmenityCatalog } from "@/features/properties/dashboard-queries";
import { ContentLanguageTabs } from "@/features/i18n/content-language-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import {
  getContentTranslations,
  resolveOrgLocale,
  type TranslatedFields,
} from "@/lib/i18n/content-translations";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Amenities",
};

export const dynamic = "force-dynamic";

function toNameRecord(
  map: Map<string, TranslatedFields>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, fields] of map) {
    if (typeof fields.name === "string") out[id] = fields.name;
  }
  return out;
}

export default async function AmenitiesPage({
  searchParams,
}: {
  searchParams?: { lang?: string | string[] };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }

  const org = context.organization;
  const def = org.default_language;
  const languages = Array.from(
    new Set([def, ...(org.enabled_languages ?? [])]),
  );
  const langParam =
    typeof searchParams?.lang === "string" ? searchParams.lang : undefined;
  const selected = resolveOrgLocale(org, langParam);
  const isDefault = selected === def;

  const catalog = await getAmenityCatalog(org.id);
  const canManage = hasPermission(context, "properties.manage_all");

  const [catTr, amTr] = isDefault
    ? [new Map<string, TranslatedFields>(), new Map<string, TranslatedFields>()]
    : await Promise.all([
        getContentTranslations(org.id, "amenity_category", selected, def),
        getContentTranslations(org.id, "amenity", selected, def),
      ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Properties", href: ROUTES.dashboard.properties },
          { label: "Amenities" },
        ]}
        title="Amenities"
        description={`Amenity catalog used across the listings of ${org.name}.`}
      />
      <ContentLanguageTabs
        languages={languages}
        current={selected}
        defaultLocale={def}
      />
      <AmenitiesManager
        key={selected}
        catalog={catalog}
        canManage={canManage}
        locale={selected}
        isDefault={isDefault}
        categoryTranslations={toNameRecord(catTr)}
        amenityTranslations={toNameRecord(amTr)}
      />
    </div>
  );
}
