import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <article className="container max-w-3xl py-12 prose prose-sm">
      <h1>Terms of service</h1>
      <p>
        By using this website you agree to the terms described below. The
        terms are governed by the realtor&apos;s local jurisdiction.
      </p>
      <h2>Listings</h2>
      <p>
        Property listings are provided for informational purposes. Final
        prices, availability and conditions are confirmed in writing before
        any agreement.
      </p>
      <h2>Bookings and payments</h2>
      <p>
        Online booking is non-binding until confirmed by the realtor.
        Refunds follow the cancellation policy of each listing.
      </p>
      <h2>Liability</h2>
      <p>
        This website is provided as is, without warranties of completeness
        or fitness for a particular purpose.
      </p>
    </article>
  );
}
