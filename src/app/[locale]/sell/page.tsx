import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeadForm } from "@/features/crm/lead-form";
import { getPageIntro } from "@/features/page-intros/queries";
import { ROUTES } from "@/lib/constants/routes";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildLocaleAlternates } from "@/lib/seo/alternates";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  eyebrow: "Sell with us",
  heading: "Sell your property",
  subheading:
    "Request a free, no-obligation valuation. I'll review the details and come back to you with an estimate — no pressure, no spam.",
};

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  return {
    title: site
      ? `Sell your property — ${site.organization.name}`
      : "Sell your property",
    description: "Request a free, no-obligation valuation of your property.",
    alternates: await buildLocaleAlternates(locale, ROUTES.public.sell),
  };
}

export default async function SellPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }
  const intro = await getPageIntro(site.organization.id, "sell");
  const eyebrow = intro?.eyebrow ?? DEFAULTS.eyebrow;
  const heading = intro?.heading ?? DEFAULTS.heading;
  const subheading = intro?.subheading ?? DEFAULTS.subheading;

  return (
    <main style={{ background: "var(--bg-primary)" }}>
      <section style={{ paddingTop: 130, paddingBottom: "clamp(64px, 8vw, 110px)" }}>
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <span className="eyebrow gold">
              <span className="dot" />
              {eyebrow}
            </span>
            <h1
              className="serif"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                letterSpacing: "-0.04em",
                marginTop: 18,
                lineHeight: 1,
                fontWeight: 400,
              }}
            >
              {heading}
            </h1>
            <p
              style={{
                marginTop: 22,
                fontSize: 17,
                color: "var(--text-secondary)",
                lineHeight: 1.55,
                maxWidth: "54ch",
              }}
            >
              {subheading}
            </p>
            <div
              style={{
                marginTop: 40,
                border: "1px solid var(--border-subtle)",
                borderRadius: 16,
                background: "var(--bg-elevated)",
                boxShadow:
                  "0 1px 2px rgba(11,11,12,0.04), 0 24px 60px -34px rgba(11,11,12,0.22)",
                padding: "clamp(24px, 3vw, 38px)",
              }}
            >
              <LeadForm kind="valuation" locale={locale} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
