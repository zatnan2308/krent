import type { Metadata } from "next";
import Link from "next/link";

import { PlaceholderSection } from "@/features/portal/placeholder-section";
import { PortalRemoveButton } from "@/features/portal/portal-remove-button";
import {
  getBuyerPortalData,
  getPortalAccount,
} from "@/features/portal/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Buyer portal",
};

export default async function BuyerPortalPage() {
  const resolved = await getPortalAccount("buyer");
  if (!resolved) {
    return (
      <EmptyState
        title="No buyer portal access"
        description="This account is not linked to a buyer portal."
      />
    );
  }

  const data = await getBuyerPortalData(resolved.account);
  const locale = resolved.organization.default_language;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Buyer portal</h1>
        <p className="text-sm text-muted-foreground">
          {resolved.organization.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved properties</CardTitle>
        </CardHeader>
        <CardContent>
          {data.savedProperties.length > 0 ? (
            <ul className="divide-y">
              {data.savedProperties.map((item) => (
                <li
                  key={item.favoriteId}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    {item.slug ? (
                      <Link
                        href={`/${locale}/properties/${item.slug}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{item.title}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <PortalRemoveButton kind="favorite" id={item.favoriteId} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have not saved any properties yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved searches</CardTitle>
        </CardHeader>
        <CardContent>
          {data.savedSearches.length > 0 ? (
            <ul className="divide-y">
              {data.savedSearches.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  <PortalRemoveButton kind="search" id={item.id} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have no saved searches.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Showing requests</CardTitle>
        </CardHeader>
        <CardContent>
          {data.leads.length > 0 ? (
            <ul className="divide-y">
              {data.leads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {lead.propertyTitle ?? "General inquiry"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.type.replace(/_/g, " ")} ·{" "}
                      {new Date(lead.createdAt).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {lead.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have no showing requests yet.
            </p>
          )}
        </CardContent>
      </Card>

      <PlaceholderSection
        title="Appointments"
        description="Scheduled viewings and meetings will appear here."
      />
      <PlaceholderSection
        title="Documents"
        description="Documents shared by your agent will appear here."
      />
    </div>
  );
}
