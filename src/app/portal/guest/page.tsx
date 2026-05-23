import type { Metadata } from "next";

import { PlaceholderSection } from "@/features/portal/placeholder-section";
import { getPortalAccount } from "@/features/portal/queries";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Guest portal",
};

export default async function GuestPortalPage() {
  const resolved = await getPortalAccount("guest");
  if (!resolved) {
    return (
      <EmptyState
        title="No guest portal access"
        description="This account is not linked to a guest portal."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Guest portal</h1>
        <p className="text-sm text-muted-foreground">
          {resolved.organization.name}
        </p>
      </div>

      <PlaceholderSection
        title="My bookings"
        description="Your bookings will appear here once rental booking is available."
      />
      <PlaceholderSection
        title="Booking status"
        description="The status of each booking will be shown here."
      />
      <PlaceholderSection
        title="Check-in / check-out"
        description="Check-in and check-out details appear once a property manager confirms your booking."
      />
      <PlaceholderSection
        title="Payment status"
        description="Payment status for your bookings will appear here."
      />
      <PlaceholderSection
        title="Documents"
        description="Booking documents will appear here."
      />
    </div>
  );
}
