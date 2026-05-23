import type { Metadata } from "next";

import { toPublicProperty } from "@/features/agency-api/feeds";
import {
  findAgentConnectionByAgent,
  getPropertySyncSettings,
  listAgentPropertiesForApi,
} from "@/features/agency-api/queries";
import { resolvePublicOrganization } from "@/server/public-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Properties",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: { agentId: string };
  searchParams: { view?: string; locale?: string };
}

function formatPrice(price: { amount: number; currency: string } | null) {
  if (!price) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency,
      maximumFractionDigits: 0,
    }).format(price.amount);
  } catch {
    return `${price.amount} ${price.currency}`;
  }
}

export default async function WidgetPage({ params, searchParams }: PageProps) {
  const organization = await resolvePublicOrganization();
  if (!organization) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Widget unavailable: organization not resolved.
      </div>
    );
  }
  const locale = searchParams.locale ?? "en";
  const connection = await findAgentConnectionByAgent(
    organization.id,
    params.agentId,
  );
  const records = await listAgentPropertiesForApi({
    organizationId: organization.id,
    agentId: params.agentId,
    locale,
    limit: 24,
    agentWebsiteConnectionId: connection?.id ?? null,
  });
  const settings = await getPropertySyncSettings(organization.id);
  const items = records.map((record) =>
    toPublicProperty({
      ...record,
      context: { settings, baseUrl: "" },
    }),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-3 bg-white p-4">
      <h1 className="text-base font-semibold">
        {connection?.name ?? "Properties"}
      </h1>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No properties available right now.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const photo =
              item.media.find((m) => m.category === "photo") ?? item.media[0];
            const price = formatPrice(item.price);
            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-lg border bg-white shadow-sm"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={photo.alt ?? item.title}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="h-40 w-full bg-muted" />
                )}
                <div className="space-y-1 p-3">
                  <p className="line-clamp-1 text-sm font-semibold">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[item.location?.city, item.location?.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {price ? (
                    <p className="text-sm font-semibold">{price}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
