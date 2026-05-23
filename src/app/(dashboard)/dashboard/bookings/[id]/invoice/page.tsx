import { notFound, redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const dynamic = "force-dynamic";

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default async function BookingInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) return null;
  if (!hasPermission(context, "bookings.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("rental_bookings")
    .select(
      "id, reference, check_in, check_out, nights, adults, children, pets, status, source, subtotal, cleaning_fee, security_deposit, taxes, discount, total, currency, payment_status, guest_name, guest_email, guest_phone, property_id",
    )
    .eq("id", params.id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!booking) notFound();

  const { data: property } = await admin
    .from("properties")
    .select("id, title")
    .eq("id", booking.property_id)
    .maybeSingle();
  const { data: fees } = await admin
    .from("rental_fees")
    .select("kind, label, amount, currency, is_refundable")
    .eq("booking_id", booking.id)
    .order("sort_order");
  const { data: brand } = await admin
    .from("brand_settings")
    .select("logo_url, primary_color")
    .eq("organization_id", context.organization.id)
    .maybeSingle();

  return (
    <article className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-background p-8 text-sm shadow-sm print:border-0 print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          {brand?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo_url}
              alt={context.organization.name}
              className="mb-2 h-10 w-auto"
            />
          ) : null}
          <p className="text-lg font-semibold">{context.organization.name}</p>
          <p className="text-xs text-muted-foreground">
            Invoice {booking.reference}
          </p>
        </div>
        <div className="text-right text-xs">
          <p>Issued: {new Date().toLocaleDateString()}</p>
          <p>Status: {booking.status}</p>
          <p>Payment: {booking.payment_status}</p>
        </div>
      </header>

      <section>
        <p className="font-semibold">Billed to</p>
        <p>{booking.guest_name ?? "Guest"}</p>
        {booking.guest_email ? <p>{booking.guest_email}</p> : null}
        {booking.guest_phone ? <p>{booking.guest_phone}</p> : null}
      </section>

      <section>
        <p className="font-semibold">Stay</p>
        <p>{property?.title ?? "Property"}</p>
        <p className="text-muted-foreground">
          {booking.check_in} → {booking.check_out} · {booking.nights} night(s) ·
          {booking.adults} adult(s)
          {booking.children ? `, ${booking.children} child(ren)` : ""}
          {booking.pets ? `, ${booking.pets} pet(s)` : ""}
        </p>
      </section>

      <section>
        <p className="mb-2 font-semibold">Charges</p>
        <table className="w-full border-collapse">
          <tbody>
            {(fees ?? []).map((fee, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-1.5">{fee.label}</td>
                <td className="py-1.5 text-right">
                  {money(fee.amount, fee.currency)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 font-semibold">Total</td>
              <td className="pt-3 text-right font-semibold">
                {money(booking.total, booking.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="border-t pt-4 text-xs text-muted-foreground">
        <p>
          Thank you for booking with {context.organization.name}. This
          invoice is auto-generated and does not require a signature.
        </p>
        <p className="mt-1">
          Print or save this page as PDF from your browser (Ctrl/Cmd + P →
          Save as PDF).
        </p>
      </footer>
    </article>
  );
}
