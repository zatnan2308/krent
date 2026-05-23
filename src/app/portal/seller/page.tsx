import type { Metadata } from "next";

import { PlaceholderSection } from "@/features/portal/placeholder-section";
import {
  getPortalAccount,
  getSellerPortalData,
  type SellerLeadItem,
} from "@/features/portal/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Seller portal",
};

function LeadList({ leads }: { leads: SellerLeadItem[] }) {
  return (
    <ul className="divide-y">
      {leads.map((lead) => (
        <li
          key={lead.id}
          className="flex items-center justify-between gap-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{lead.propertyTitle}</p>
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
  );
}

export default async function SellerPortalPage() {
  const resolved = await getPortalAccount("seller");
  if (!resolved) {
    return (
      <EmptyState
        title="No seller portal access"
        description="This account is not linked to a seller portal."
      />
    );
  }

  const data = await getSellerPortalData(resolved.account);
  const showings = data.inquiries.filter(
    (lead) => lead.source === "showing_request",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seller portal</h1>
        <p className="text-sm text-muted-foreground">
          {resolved.organization.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My properties</CardTitle>
        </CardHeader>
        <CardContent>
          {data.properties.length > 0 ? (
            <ul className="divide-y">
              {data.properties.map((property) => (
                <li
                  key={property.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{property.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {property.purpose.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {property.status.replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No properties are linked to your account yet.
            </p>
          )}
        </CardContent>
      </Card>

      <PlaceholderSection
        title="Property activity"
        description="Views and engagement stats appear once the analytics module is configured for this installation."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inquiries</CardTitle>
        </CardHeader>
        <CardContent>
          {data.inquiries.length > 0 ? (
            <LeadList leads={data.inquiries} />
          ) : (
            <p className="text-sm text-muted-foreground">No inquiries yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Showings</CardTitle>
        </CardHeader>
        <CardContent>
          {showings.length > 0 ? (
            <LeadList leads={showings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No showing requests yet.
            </p>
          )}
        </CardContent>
      </Card>

      <PlaceholderSection
        title="Seller reports"
        description="Performance reports for your listings will appear here."
      />
      <PlaceholderSection
        title="Documents"
        description="Document uploads and signed-URL sharing become available once private documents storage is configured for this installation."
      />
    </div>
  );
}
