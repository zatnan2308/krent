import type { Metadata } from "next";
import Link from "next/link";

import {
  PORTAL_TYPE_DESCRIPTIONS,
  PORTAL_TYPE_LABELS,
} from "@/features/portal/constants";
import { listUserPortals } from "@/features/portal/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Client portal",
};

export default async function PortalHubPage() {
  const portals = await listUserPortals();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your portals</h1>
        <p className="text-sm text-muted-foreground">
          Access the services your agency has shared with you.
        </p>
      </div>

      {portals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {portals.map((type) => (
            <Link key={type} href={`/portal/${type}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    {PORTAL_TYPE_LABELS[type]} portal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {PORTAL_TYPE_DESCRIPTIONS[type]}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No portal access yet"
          description="When an agency invites you, your portals will appear here."
        />
      )}
    </div>
  );
}
