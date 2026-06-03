import type { Metadata } from "next";
import Link from "next/link";

import { getAboutContent } from "@/features/about/queries";
import { getHomeContent } from "@/features/home/queries";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildLocaleAlternates, buildLocalizedPath } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

const DEFAULT_PORTRAIT =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1800&q=85&auto=format&fit=crop";

/** Дефолтные milestones — переопределяемые редактором в будущем
 *  через отдельную таблицу. Сейчас редакционная хардкод-канва. */
const DEFAULT_TIMELINE = [
  {
    year: "2016",
    title: "Arrived in Dubai",
    body: "Took the RERA exam in three months and joined one of the city's largest Marina-focused agencies.",
  },
  {
    year: "2018",
    title: "First off-market deal",
    body: "A villa in Emirates Hills, sold before it ever reached a portal. The model became the method.",
  },
  {
    year: "2019",
    title: "Went independent",
    body: "Left the volume agency, capped the book at twelve active clients. Dubai only, by choice.",
  },
  {
    year: "2021",
    title: "Branded residences",
    body: "Deepened into Downtown and Palm Jumeirah — Bulgari, Armani, One at Palm Jumeirah.",
  },
  {
    year: "2023",
    title: "Property Finder Superagent",
    body: "Top 1% of Dubai agents by client rating, two years running. Featured in Forbes Middle East.",
  },
  {
    year: "2024",
    title: "Two hundredth deal",
    body: "Across Marina, Downtown, Palm and the Hills — every one walked personally before listing.",
  },
  {
    year: String(new Date().getFullYear()),
    title: "Today",
    body: "One city · ~12 clients at any time · every building known by name.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const dictionary = getDictionary(locale);
  const site = await getPublicSiteContext();
  const baseTitle = site ? `About — ${site.organization.name}` : dictionary.nav.about;
  return {
    title: baseTitle,
    description:
      "One person, twelve clients, one city. A RERA-licensed Dubai realtor who walks every building before listing it.",
    alternates: buildLocaleAlternates(locale, "/about"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();

  const content = site
    ? await getHomeContent(site.organization.id)
    : {
        hero: null,
        about: null,
        cta: null,
        markets: [],
        process: [],
        testimonials: [],
        trust: [],
        press: [],
      };

  const { about, markets, trust, press } = content;
  const siteName = site?.organization.name ?? "Independent Realtor";
  const portrait = about?.portrait_url || DEFAULT_PORTRAIT;
  const heroParagraph =
    about?.body ||
    `${siteName} has spent the last years selling Dubai property the old way — by walking through it, knowing the building, and answering personally. RERA-licensed, Dubai-based, one city known street by street.`;

  const stats = about
    ? [
        { v: about.metric_1_value, l: about.metric_1_label },
        { v: about.metric_2_value, l: about.metric_2_label },
        { v: about.metric_3_value, l: about.metric_3_label },
      ].filter((m): m is { v: string; l: string } => Boolean(m.v && m.l))
    : [];

  const contactHref = buildLocalizedPath(locale, "/contact");
  const propertiesHref = buildLocalizedPath(locale, "/properties");

  // Редактируемый контент /about (тексты + вехи) с фолбэком на дефолты.
  const aboutContent = site
    ? await getAboutContent(site.organization.id)
    : { page: null, milestones: [] };
  const timeline =
    aboutContent.milestones.length > 0
      ? aboutContent.milestones.map((m) => ({
          year: m.year,
          title: m.title,
          body: m.body,
        }))
      : DEFAULT_TIMELINE;
  const heroTitle = aboutContent.page?.hero_title ?? null;
  const storyHeading = aboutContent.page?.story_heading ?? null;
  const storyParas = aboutContent.page?.story_body
    ? aboutContent.page.story_body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : null;
  const quote1 = aboutContent.page?.quote_1 ?? null;
  const quote2 = aboutContent.page?.quote_2 ?? null;

  return (
    <>
      {/* ============================================================
          HERO — 5fr portrait / 7fr text + stats
          ============================================================ */}
      <section
        style={{
          position: "relative",
          minHeight: "92vh",
          background: "var(--bg-secondary)",
          marginTop: 80,
          overflow: "hidden",
        }}
      >
        <div
          className="ed-about-hero-grid"
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "80px var(--edge-d) 60px",
            display: "grid",
            gridTemplateColumns: "5fr 7fr",
            gap: 80,
            alignItems: "start",
          }}
        >
          <div
            className="on-dark"
            style={{
              aspectRatio: "4 / 5",
              background: "#1A1A1F",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={portrait}
              alt={siteName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "grayscale(0.7) contrast(1.05) brightness(0.92)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "24px 28px",
                background:
                  "linear-gradient(180deg, rgba(11,11,12,0) 0%, rgba(11,11,12,0.85) 100%)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>{siteName}</span>
              <span style={{ color: "var(--accent)" }}>
                Dubai, {new Date().getFullYear()}
              </span>
            </div>
          </div>

          <div style={{ paddingTop: 20 }}>
            <span className="eyebrow gold">
              <span className="dot" />
              About
            </span>

            <h1
              className="serif"
              style={{
                fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)",
                letterSpacing: "-0.045em",
                lineHeight: 0.96,
                marginTop: 24,
                fontWeight: 350,
                maxWidth: "14ch",
                whiteSpace: "pre-line",
              }}
            >
              {heroTitle ?? (
                <>
                  One person.
                  <br />
                  <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                    Twelve clients.
                  </em>
                  <br />
                  One city.
                </>
              )}
            </h1>

            <p
              style={{
                marginTop: 40,
                fontSize: 18,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                maxWidth: "46ch",
                whiteSpace: "pre-line",
              }}
            >
              {heroParagraph}
            </p>

            {stats.length > 0 ? (
              <div
                className="ed-about-stats"
                style={{
                  marginTop: 60,
                  paddingTop: 36,
                  borderTop: "1px solid var(--border-medium)",
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
                  gap: 28,
                }}
              >
                {stats.slice(0, 3).map((s) => (
                  <div key={s.l}>
                    <div
                      className="serif tnum"
                      style={{
                        fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                        letterSpacing: "-0.035em",
                        lineHeight: 1,
                        color: "var(--text-primary)",
                        fontWeight: 350,
                      }}
                    >
                      {s.v}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                        letterSpacing: "0.04em",
                        lineHeight: 1.4,
                      }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .ed-about-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
            .ed-about-stats { grid-template-columns: 1fr !important; gap: 24px !important; }
          }
        `}</style>
      </section>

      {/* ============================================================
          STORY — sticky side header + drop-cap текст + pull-quotes
          ============================================================ */}
      <section
        style={{
          background: "var(--bg-primary)",
          padding: "140px 0 80px",
        }}
      >
        <div
          className="ed-story-grid"
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
            display: "grid",
            gridTemplateColumns: "3fr 9fr",
            gap: 64,
            alignItems: "start",
          }}
        >
          <div className="ed-story-side" style={{ position: "sticky", top: 110 }}>
            <span className="eyebrow gold">The story</span>
            <h2
              className="serif"
              style={{
                fontSize: "clamp(1.75rem, 2.6vw, 2.25rem)",
                letterSpacing: "-0.03em",
                marginTop: 18,
                lineHeight: 1.05,
                fontWeight: 400,
              }}
            >
              {storyHeading ??
                "How one agent ended up knowing Dubai block by block."}
            </h2>
          </div>

          <div style={{ maxWidth: "66ch" }}>
            {storyParas ? (
              <DynamicStory
                paras={storyParas}
                quote1={quote1}
                quote2={quote2}
              />
            ) : (
              <>
                <p
                  className="drop-cap"
                  style={{
                    fontSize: 18,
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                  }}
                >
                  Dubai, a few years back. The first deal closed — an apartment
                  in the Marina, sold to a family who had been waiting for the
                  right building for nine months. Four of them spent walking
                  that family through every tower in person. The commission
                  covered the next two years. The lesson stayed longer.
                </p>

                <PullQuote>
                  Most agents were closing twenty deals a year by saying yes to
                  everyone. I was closing six by saying no.
                </PullQuote>

                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                    marginTop: 24,
                  }}
                >
                  The RERA exam, then a year inside one of the city&apos;s
                  largest agencies. Left within twelve months. Volume agencies
                  are built to maximise the broker — not the client. Re-licensed
                  independently, capped the book at twelve active clients, never
                  looked back.
                </p>

                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                    marginTop: 24,
                  }}
                >
                  The depth came from staying put. One city, learned tower by
                  tower — which floors get the morning light, which buildings
                  hold their service charges, which developers actually hand
                  over on time. Downtown, the Marina, Palm Jumeirah, the Hills.
                  Every property walked personally before it is ever listed.
                </p>

                <PullQuote>
                  The job isn&apos;t selling a flat. The job is making sure you
                  don&apos;t buy the wrong one.
                </PullQuote>

                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                    marginTop: 24,
                  }}
                >
                  What hasn&apos;t changed: every client gets a mobile number on
                  day one. Every deal gets full attention end-to-end. There is
                  no assistant, no junior, no team screen in between. That is
                  the entire model.
                </p>
              </>
            )}
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .ed-story-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
            .ed-story-side { position: static !important; }
          }
        `}</style>
      </section>

      {/* ============================================================
          TIMELINE — milestones
          ============================================================ */}
      <section
        style={{
          background: "var(--bg-secondary)",
          padding: "140px 0",
          borderTop: "1px solid var(--border-subtle)",
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
            Milestones
          </span>
          <h2
            className="serif"
            style={{
              fontSize: "var(--text-h2)",
              letterSpacing: "-0.04em",
              marginTop: 22,
              lineHeight: 1,
              maxWidth: "16ch",
              marginBottom: 80,
            }}
          >
            Years, cities,{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
              one rule.
            </em>
          </h2>

          <div>
            {timeline.map((it, i) => (
              <div
                key={it.year + it.title}
                className="ed-timeline-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 2fr",
                  gap: 56,
                  padding: "36px 0",
                  borderTop: "1px solid var(--border-subtle)",
                  borderBottom:
                    i === timeline.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  alignItems: "baseline",
                }}
              >
                <div
                  className="serif tnum"
                  style={{
                    fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                    letterSpacing: "-0.025em",
                    color: "var(--accent)",
                    lineHeight: 1,
                    fontWeight: 350,
                    fontStyle: "italic",
                  }}
                >
                  {it.year}
                </div>
                <h3
                  className="serif"
                  style={{
                    fontSize: "clamp(1.25rem, 2vw, 1.625rem)",
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                    fontWeight: 400,
                    lineHeight: 1.1,
                  }}
                >
                  {it.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {it.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .ed-timeline-row {
              grid-template-columns: auto 1fr !important;
              gap: 20px !important;
            }
            .ed-timeline-row > p { grid-column: 1 / -1; }
          }
        `}</style>
      </section>

      {/* ============================================================
          MARKETS — из БД (если есть) или фолбэк
          ============================================================ */}
      {markets.length > 0 ? (
        <section
          style={{
            background: "var(--bg-primary)",
            padding: "140px 0",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
            }}
          >
            <div
              className="ed-section-header"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 60,
                alignItems: "end",
                marginBottom: 64,
              }}
            >
              <div>
                <span className="eyebrow gold">
                  <span className="dot" />
                  Where I work
                </span>
                <h2
                  className="serif"
                  style={{
                    fontSize: "var(--text-h2)",
                    letterSpacing: "-0.04em",
                    marginTop: 22,
                    lineHeight: 1,
                  }}
                >
                  One city,
                  <br />
                  <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                    known block by block.
                  </em>
                </h2>
              </div>
              <p
                style={{
                  fontSize: 16,
                  color: "var(--text-secondary)",
                  maxWidth: "42ch",
                  lineHeight: 1.55,
                  paddingBottom: 12,
                }}
              >
                Every premium community in Dubai, covered full-time and in
                person — from Downtown and the Marina to Palm Jumeirah and the
                Hills.
              </p>
            </div>

            <div>
              {markets.map((m, i) => (
                <div
                  key={m.id}
                  className="ed-market-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 4fr 5fr",
                    gap: 56,
                    padding: "40px 0",
                    borderTop: "1px solid var(--border-subtle)",
                    borderBottom:
                      i === markets.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    alignItems: "baseline",
                  }}
                >
                  <div>
                    <h3
                      className="serif"
                      style={{
                        fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                        letterSpacing: "-0.035em",
                        color: "var(--text-primary)",
                        fontWeight: 400,
                        lineHeight: 1,
                      }}
                    >
                      {m.name}
                    </h3>
                    {m.region ? (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {m.region}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    {m.badge ? <span className="eyebrow gold">{m.badge}</span> : null}
                  </div>
                  {m.blurb ? (
                    <p
                      style={{
                        fontSize: 15,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                      }}
                    >
                      {m.blurb}
                    </p>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .ed-section-header { grid-template-columns: 1fr !important; gap: 32px !important; }
              .ed-market-row { grid-template-columns: 1fr !important; gap: 16px !important; }
            }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          CREDENTIALS — trust badges + press
          ============================================================ */}
      {trust.length > 0 || press.length > 0 ? (
        <section
          style={{
            background: "var(--bg-secondary)",
            padding: "100px 0",
            borderTop: "1px solid var(--border-subtle)",
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
            {trust.length > 0 ? (
              <div
                className="ed-cred-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: 60,
                  alignItems: "start",
                }}
              >
                <span className="eyebrow gold">
                  Licensed &amp;<br />
                  registered
                </span>
                <div
                  className="ed-cred-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "36px 48px",
                  }}
                >
                  {trust.map((t) => (
                    <div key={t.id}>
                      <div
                        className="serif"
                        style={{
                          fontSize: 26,
                          letterSpacing: "-0.025em",
                          color: "var(--text-primary)",
                          lineHeight: 1,
                          fontWeight: 400,
                        }}
                      >
                        {t.label}
                      </div>
                      {t.sub ? (
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 12.5,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {t.sub}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {press.length > 0 ? (
              <div
                className="ed-cred-grid"
                style={{
                  marginTop: trust.length > 0 ? 80 : 0,
                  paddingTop: trust.length > 0 ? 40 : 0,
                  borderTop: trust.length > 0
                    ? "1px dashed var(--border-subtle)"
                    : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: 60,
                  alignItems: "center",
                }}
              >
                <span className="eyebrow">Featured in</span>
                <div
                  style={{
                    display: "flex",
                    gap: "24px 56px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {press.map((p) =>
                    p.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.logo_url}
                        alt={p.name}
                        style={{ height: 24, width: "auto", opacity: 0.8 }}
                      />
                    ) : (
                      <span
                        key={p.id}
                        className="serif"
                        style={{
                          fontSize: 18,
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                          letterSpacing: "-0.005em",
                          fontWeight: 350,
                        }}
                      >
                        {p.name}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <style>{`
            @media (max-width: 900px) {
              .ed-cred-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
              .ed-cred-row { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
            }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          CTA — "Worth a conversation?"
          ============================================================ */}
      <section
        style={{
          background: "var(--bg-primary)",
          padding: "140px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden
          className="serif"
          style={{
            position: "absolute",
            right: -60,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "clamp(14rem, 30vw, 28rem)",
            lineHeight: 0.85,
            color: "var(--accent)",
            opacity: 0.05,
            pointerEvents: "none",
            fontStyle: "italic",
            letterSpacing: "-0.06em",
            fontWeight: 300,
            userSelect: "none",
          }}
        >
          Hello.
        </span>
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
            position: "relative",
          }}
        >
          <div style={{ maxWidth: 720 }}>
            <span className="eyebrow gold">
              <span className="dot" />
              Get in touch
            </span>
            <h2
              className="serif"
              style={{
                fontSize: "var(--text-h1)",
                letterSpacing: "-0.04em",
                marginTop: 22,
                lineHeight: 0.98,
              }}
            >
              Worth a conversation?
              <br />
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                Then let&apos;s have one.
              </em>
            </h2>
            <p
              style={{
                marginTop: 28,
                fontSize: 18,
                color: "var(--text-secondary)",
                maxWidth: "52ch",
                lineHeight: 1.55,
              }}
            >
              Initial calls are thirty minutes, free, and binding on nothing.
              Easiest way to find out if we should work together.
            </p>
            <div
              style={{
                marginTop: 40,
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <Link href={contactHref} className="btn btn-solid">
                Contact us <span className="arrow">→</span>
              </Link>
              <Link href={propertiesHref} className="btn btn-ghost">
                Browse properties
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DynamicStory({
  paras,
  quote1,
  quote2,
}: {
  paras: string[];
  quote1: string | null;
  quote2: string | null;
}) {
  const mid = Math.ceil(paras.length / 2);
  return (
    <>
      {paras.map((p, i) => (
        <div key={i}>
          <p
            className={i === 0 ? "drop-cap" : ""}
            style={{
              fontSize: i === 0 ? 18 : 17,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              marginTop: i === 0 ? 0 : 24,
            }}
          >
            {p}
          </p>
          {i === 0 && quote1 ? <PullQuote>{quote1}</PullQuote> : null}
          {i !== 0 && i === mid - 1 && quote2 ? (
            <PullQuote>{quote2}</PullQuote>
          ) : null}
        </div>
      ))}
    </>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="serif"
      style={{
        margin: "48px 0",
        padding: "32px 0",
        borderTop: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)",
        letterSpacing: "-0.025em",
        lineHeight: 1.2,
        color: "var(--text-primary)",
        fontWeight: 350,
      }}
    >
      <span
        style={{
          color: "var(--accent)",
          fontStyle: "italic",
        }}
      >
        “
      </span>
      {children}
      <span
        style={{
          color: "var(--accent)",
          fontStyle: "italic",
        }}
      >
        ”
      </span>
    </blockquote>
  );
}
