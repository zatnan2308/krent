import type { Metadata } from "next";

import { EditorialContactForm } from "@/features/contact/editorial-contact-form";
import { getHomeContent } from "@/features/home/queries";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildLocaleAlternates } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop";

const CONTACT_LINES: { label: string; value: string }[] = [
  { label: "Direct", value: "+971 50 ••• ••••" },
  { label: "WhatsApp", value: "+971 50 ••• ••••" },
  { label: "Email", value: "hello@krent.realty" },
  { label: "Telegram", value: "@krent_realty" },
];

const SOCIAL_LINKS: { label: string; handle: string; href: string }[] = [
  { label: "Instagram", handle: "@krent.realty", href: "#" },
  { label: "LinkedIn", handle: "in/krent", href: "#" },
  { label: "X", handle: "@krent_realty", href: "#" },
  { label: "YouTube", handle: "Krent Property Diaries", href: "#" },
];

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const dictionary = getDictionary(locale);
  const site = await getPublicSiteContext();
  const baseTitle = site
    ? `Contact — ${site.organization.name}`
    : dictionary.nav.contact;
  return {
    title: baseTitle,
    description:
      "Tell us what you're looking for. Replies within an hour, in your timezone, from a person — not an assistant.",
    alternates: buildLocaleAlternates(locale, "/contact"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  const content = site
    ? await getHomeContent(site.organization.id)
    : { about: null };

  const siteName = site?.organization.name ?? "Independent Realtor";
  const avatar = content.about?.portrait_url || DEFAULT_AVATAR;
  const credentialsLine = "Licensed Realtor · RERA #58432 · NAR registered";

  return (
    <>
      {/* ============================================================
          HERO — eyebrow + headline + subtext
          ============================================================ */}
      <section
        style={{
          background: "var(--bg-primary)",
          paddingTop: 160,
          paddingBottom: 56,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <span className="eyebrow gold">
            <span className="dot" />
            Let&apos;s talk
          </span>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)",
              letterSpacing: "-0.045em",
              marginTop: 22,
              lineHeight: 0.95,
              fontWeight: 350,
              maxWidth: "16ch",
            }}
          >
            Tell us what you&apos;re
            <br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
              looking for.
            </em>
          </h1>
          <p
            style={{
              marginTop: 28,
              fontSize: 18,
              color: "var(--text-secondary)",
              maxWidth: "52ch",
              lineHeight: 1.55,
            }}
          >
            Initial conversations are by direct line, WhatsApp or video. Replies
            within an hour, in your timezone, from a person — not an assistant.
          </p>
        </div>
      </section>

      {/* ============================================================
          BODY — form 7fr / info 5fr
          ============================================================ */}
      <section style={{ padding: "80px 0 120px", background: "var(--bg-primary)" }}>
        <div
          className="ed-contact-grid"
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
            display: "grid",
            gridTemplateColumns: "7fr 5fr",
            gap: 80,
            alignItems: "start",
          }}
        >
          <EditorialContactForm locale={locale} />

          <aside
            style={{ display: "flex", flexDirection: "column", gap: 40 }}
          >
            {/* Person card */}
            <div
              style={{
                padding: "28px 0",
                borderTop: "1px solid var(--border-medium)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    backgroundImage: `url(${avatar})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "grayscale(0.4)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <span className="eyebrow">Speak with</span>
                  <div
                    className="serif"
                    style={{
                      marginTop: 6,
                      fontSize: 22,
                      letterSpacing: "-0.02em",
                      color: "var(--text-primary)",
                      fontWeight: 400,
                    }}
                  >
                    {siteName}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {credentialsLine}
                  </div>
                </div>
              </div>
            </div>

            {/* Direct lines */}
            <div>
              <span className="eyebrow gold">Direct lines</span>
              <ul style={{ listStyle: "none", marginTop: 18, padding: 0 }}>
                {CONTACT_LINES.map((line) => (
                  <li
                    key={line.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "110px 1fr",
                      gap: 16,
                      alignItems: "baseline",
                      padding: "14px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {line.label}
                    </span>
                    <span
                      className="serif tnum"
                      style={{
                        fontSize: 17,
                        letterSpacing: "-0.015em",
                        color: "var(--text-primary)",
                        fontWeight: 400,
                      }}
                    >
                      {line.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Office */}
            <div>
              <span className="eyebrow gold">Office</span>
              <p
                className="serif"
                style={{
                  marginTop: 16,
                  fontSize: 18,
                  color: "var(--text-primary)",
                  lineHeight: 1.45,
                  letterSpacing: "-0.015em",
                  fontWeight: 400,
                }}
              >
                Gate Avenue, DIFC
                <br />
                Dubai, United Arab Emirates
              </p>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                By appointment only. Coffee on us.
              </p>
              <div
                className="tnum"
                style={{
                  marginTop: 14,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.04em",
                  display: "grid",
                  gridTemplateColumns: "110px 1fr",
                  gap: 8,
                  paddingTop: 14,
                  borderTop: "1px dashed var(--border-subtle)",
                }}
              >
                <span>Office hours</span>
                <span>Mon – Sat · 10:00 – 19:00 GST</span>
                <span>Response</span>
                <span>Within 1 hour, any timezone</span>
              </div>
            </div>

          </aside>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .ed-contact-grid { grid-template-columns: 1fr !important; gap: 56px !important; }
          }
        `}</style>
      </section>

      {/* ============================================================
          FOOTER STRIP — social handles
          ============================================================ */}
      <section
        style={{
          background: "var(--bg-secondary)",
          padding: "64px 0",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="ed-contact-footer-grid"
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <span className="eyebrow gold">Also reachable via</span>
          <div
            style={{
              display: "flex",
              gap: "24px 48px",
              flexWrap: "wrap",
              alignItems: "baseline",
            }}
          >
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <span
                  className="serif"
                  style={{
                    fontSize: 20,
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                    fontWeight: 400,
                    display: "block",
                  }}
                >
                  {social.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {social.handle}
                </span>
              </a>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 760px) {
            .ed-contact-footer-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          }
        `}</style>
      </section>
    </>
  );
}

