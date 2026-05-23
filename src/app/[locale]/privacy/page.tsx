import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <article className="container max-w-3xl py-12 prose prose-sm">
      <h1>Privacy policy</h1>
      <p>
        We process personal data only to deliver the requested service: lead
        and booking management, transactional emails, and analytics.
      </p>
      <h2>Data we store</h2>
      <ul>
        <li>Contact details you provide via forms (name, email, phone)</li>
        <li>Booking and payment metadata (provider, amount, status)</li>
        <li>Session analytics (page views, source, anonymous device info)</li>
      </ul>
      <h2>Marketing consent</h2>
      <p>
        Marketing emails are sent only when you explicitly opt in. You can
        unsubscribe via the link in every email.
      </p>
      <h2>Contact</h2>
      <p>
        For data requests reach out via the contact page. Replies within 30
        days.
      </p>
    </article>
  );
}
