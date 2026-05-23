import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies" };
export const dynamic = "force-dynamic";

export default function CookiesPage() {
  return (
    <article className="container max-w-3xl py-12 prose prose-sm">
      <h1>Cookies</h1>
      <p>
        We use essential cookies to keep the site working and optional
        cookies to measure traffic. Your choice is stored in
        <code> krent_cookie_consent</code>.
      </p>
      <h2>Essential</h2>
      <p>
        Required for sign-in, session, locale and currency selection.
        Cannot be disabled.
      </p>
      <h2>Analytics</h2>
      <p>
        Enabled only when you accept analytics. If you accept only
        essential cookies, we do not load tracking scripts.
      </p>
    </article>
  );
}
