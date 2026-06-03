import type { Metadata } from "next";

import { EditorialContactForm } from "@/features/contact/editorial-contact-form";
import { getHomeContent } from "@/features/home/queries";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildLocaleAlternates } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

const C_MONO = "'Geist Mono', ui-monospace, monospace";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop";

/** Контактные данные (демо-плейсхолдеры; редактируются здесь в одном месте). */
const BROKER = {
  rera: "Licensed Realtor · RERA #58432",
  whatsapp: "+971 50 ••• ••••",
  phone: "+971 50 ••• ••••",
  email: "hello@krent.realty",
  office: "Gate Avenue, DIFC — Dubai",
  officeNote: "By appointment · coffee on me",
  hours: "Mon – Sat · 10:00 – 19:00 GST",
  hoursNote: "Replies within 1 hour, any timezone",
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
  const dictionary = getDictionary(locale);
  const site = await getPublicSiteContext();
  const baseTitle = site
    ? `Contact — ${site.organization.name}`
    : dictionary.nav.contact;
  return {
    title: baseTitle,
    description:
      "Direct line, WhatsApp, email. Replies within an hour from a person — not an assistant.",
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

  const brokerName = site?.organization.name ?? "Alexey Kachan";
  const displayName = brokerName.split(/[—–]/)[0]?.trim() || brokerName;
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] ?? displayName;
  const avatar = content.about?.portrait_url || DEFAULT_AVATAR;

  const methods: {
    tag: string;
    label: string;
    value: string;
    href: string;
    accent?: boolean;
    glyph: string;
  }[] = [
    {
      tag: "Fastest",
      label: "WhatsApp",
      value: BROKER.whatsapp,
      href: "#",
      accent: true,
      glyph: "WA",
    },
    {
      tag: "Call or text",
      label: "Direct line",
      value: BROKER.phone,
      href: "#",
      glyph: "TEL",
    },
    {
      tag: "Email",
      label: "Write to me",
      value: BROKER.email,
      href: `mailto:${BROKER.email}`,
      glyph: "@",
    },
  ];

  return (
    <main style={{ background: "var(--bg-primary)" }}>
      {/* ============================================================
          HERO — eyebrow + live badge + headline + subtext
          ============================================================ */}
      <section
        style={{ paddingTop: 130, paddingBottom: "clamp(36px, 4vw, 52px)" }}
      >
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span className="eyebrow gold">
              <span className="dot" />
              Contact
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-elevated)",
                fontSize: 12,
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="cm-live"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#7DC383",
                }}
              />
              Available now · replies in ~1h
            </span>
          </div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 4rem)",
              letterSpacing: "-0.04em",
              marginTop: 18,
              lineHeight: 1,
              fontWeight: 400,
              maxWidth: "18ch",
              textWrap: "pretty",
            }}
          >
            Talk to {firstName}{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
              directly.
            </em>
          </h1>
          <p
            style={{
              marginTop: 18,
              fontSize: 17,
              color: "var(--text-secondary)",
              maxWidth: "54ch",
              lineHeight: 1.55,
            }}
          >
            Pick whatever&apos;s easiest — message now, or send the form and
            I&apos;ll reply within an hour, in your timezone. No call centre, no
            assistant.
          </p>
        </div>
      </section>

      {/* ============================================================
          BODY — methods (left) + form card (right)
          ============================================================ */}
      <section style={{ paddingBottom: "clamp(64px, 8vw, 110px)" }}>
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <div
            className="contact-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "0.85fr 1.15fr",
              gap: "clamp(28px, 4vw, 56px)",
              alignItems: "start",
            }}
          >
            {/* ---- Left: direct-contact methods ---- */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {/* Broker mini-profile */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "18px 20px",
                  borderRadius: 14,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      backgroundImage: `url(${avatar})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "grayscale(0.35)",
                    }}
                  />
                  <span
                    className="cm-live"
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: 0,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#7DC383",
                      border: "2px solid var(--bg-elevated)",
                    }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="serif"
                    style={{
                      fontSize: "1.125rem",
                      letterSpacing: "-0.015em",
                      color: "var(--text-primary)",
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 3,
                    }}
                  >
                    {BROKER.rera}
                  </div>
                  <div
                    style={{ fontSize: 11.5, color: "#5a8a60", marginTop: 4 }}
                  >
                    ● Typically replies in 1 hour
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  margin: "8px 0 2px",
                }}
              >
                Reach me directly
              </div>

              {methods.map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  className="cm-card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 20px",
                    borderRadius: 14,
                    color: "inherit",
                    textDecoration: "none",
                    border: `1px solid ${m.accent ? "var(--accent)" : "var(--border-subtle)"}`,
                    background: m.accent
                      ? "var(--accent-muted)"
                      : "var(--bg-elevated)",
                    transition:
                      "transform 400ms var(--ease-out-expo), box-shadow 400ms var(--ease-out-expo)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 42,
                        height: 42,
                        borderRadius: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: C_MONO,
                        fontSize: 15,
                        letterSpacing: "0.02em",
                        color: m.accent
                          ? "var(--bg-primary)"
                          : "var(--accent)",
                        background: m.accent
                          ? "var(--accent)"
                          : "var(--accent-muted)",
                      }}
                    >
                      {m.glyph}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 10.5,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: m.accent
                            ? "var(--accent)"
                            : "var(--text-tertiary)",
                          marginBottom: 5,
                        }}
                      >
                        {m.tag}
                      </div>
                      <div
                        className="serif"
                        style={{
                          fontSize: "1.1875rem",
                          letterSpacing: "-0.015em",
                          color: "var(--text-primary)",
                          lineHeight: 1,
                        }}
                      >
                        {m.label}
                      </div>
                      <div
                        className="tnum"
                        style={{
                          fontSize: 12.5,
                          color: "var(--text-secondary)",
                          marginTop: 5,
                        }}
                      >
                        {m.value}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      color: m.accent
                        ? "var(--accent)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    →
                  </span>
                </a>
              ))}

              {/* Office + hours */}
              <div
                style={{
                  marginTop: 10,
                  padding: "20px 22px",
                  borderRadius: 14,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-secondary)",
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 16,
                }}
              >
                <Detail
                  label="Office"
                  value={BROKER.office}
                  note={BROKER.officeNote}
                />
                <div style={{ height: 1, background: "var(--border-subtle)" }} />
                <Detail
                  label="Hours"
                  value={BROKER.hours}
                  note={BROKER.hoursNote}
                />
              </div>
            </div>

            {/* ---- Right: form card ---- */}
            <EditorialContactForm locale={locale} />
          </div>
        </div>
      </section>

      <style>{`
        .cm-live { box-shadow: 0 0 0 0 rgba(125,195,131,0.5); animation: cmPulse 2.2s ease-in-out infinite; }
        @keyframes cmPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(125,195,131,0.45); }
          50% { box-shadow: 0 0 0 6px rgba(125,195,131,0); }
        }
        .cm-card:hover { transform: translateY(-2px); box-shadow: 0 16px 38px -24px rgba(11,11,12,0.26); }
        @media (prefers-reduced-motion: reduce) { .cm-live { animation: none; } }
        @media (max-width: 920px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

function Detail({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: "1.0625rem",
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--text-secondary)",
          marginTop: 3,
        }}
      >
        {note}
      </div>
    </div>
  );
}
