/** Дефолтный контент юридических страниц (если в админке не задан). */
export const DEFAULT_LEGAL: Record<
  "privacy" | "terms" | "cookies",
  { title: string; body: string }
> = {
  privacy: {
    title: "Privacy policy",
    body: `We process personal data only to deliver the requested service: lead and booking management, transactional emails, and analytics.

## Data we store
- Contact details you provide via forms (name, email, phone)
- Booking and payment metadata (provider, amount, status)
- Session analytics (page views, source, anonymous device info)

## Marketing consent
Marketing emails are sent only when you explicitly opt in. You can unsubscribe via the link in every email.

## Contact
For data requests reach out via the contact page. Replies within 30 days.`,
  },
  terms: {
    title: "Terms of service",
    body: `By using this website you agree to the terms described below. The terms are governed by the realtor's local jurisdiction.

## Listings
Property listings are provided for informational purposes. Final prices, availability and conditions are confirmed in writing before any agreement.

## Bookings and payments
Online booking is non-binding until confirmed by the realtor. Refunds follow the cancellation policy of each listing.

## Liability
This website is provided as is, without warranties of completeness or fitness for a particular purpose.`,
  },
  cookies: {
    title: "Cookies",
    body: `We use essential cookies to keep the site working and optional cookies to measure traffic. Your choice is stored in your browser.

## Essential
Required for sign-in, session, locale and currency selection. Cannot be disabled.

## Analytics
Enabled only when you accept analytics. If you accept only essential cookies, we do not load tracking scripts.`,
  },
};
