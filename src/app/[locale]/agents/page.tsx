import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listPublicAgents } from "@/features/agents/queries";
import { getPageIntro } from "@/features/page-intros/queries";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildLocaleAlternates } from "@/lib/seo/alternates";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

/** Инициалы для аватара-заглушки. */
function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "A";
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  const title = site ? `Our agents — ${site.organization.name}` : "Our agents";
  return {
    title,
    description: site
      ? `Meet the property experts at ${site.organization.name}.`
      : undefined,
    alternates: await buildLocaleAlternates(locale, "/agents"),
  };
}

export default async function AgentsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }
  const [agents, intro] = await Promise.all([
    listPublicAgents(site.organization.id),
    getPageIntro(site.organization.id, "agents"),
  ]);

  const eyebrow = intro?.eyebrow ?? "The team";
  const heading = intro?.heading ?? "Our agents";
  const subheading =
    intro?.subheading ?? `Property experts at ${site.organization.name}.`;

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

          {agents.length > 0 ? (
            <div
              className="ed-agents-grid"
              style={{
                marginTop: 56,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
              }}
            >
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/${locale}/agents/${agent.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "20px 22px",
                    borderRadius: 14,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    className="serif"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "var(--bg-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                      flexShrink: 0,
                    }}
                  >
                    {initials(agent.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="serif"
                      style={{
                        fontSize: 18,
                        letterSpacing: "-0.015em",
                        color: "var(--text-primary)",
                      }}
                    >
                      {agent.name}
                    </div>
                    {agent.title ? (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12.5,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {agent.title}
                      </div>
                    ) : null}
                    <div
                      className="tnum"
                      style={{
                        marginTop: 3,
                        fontSize: 12.5,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {agent.listingCount} active listing
                      {agent.listingCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p
              style={{
                marginTop: 48,
                fontSize: 15,
                color: "var(--text-tertiary)",
              }}
            >
              Agent profiles will appear here once listings are assigned.
            </p>
          )}
        </div>

        <style>{`
          @media (max-width: 900px) {
            .ed-agents-grid { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 600px) {
            .ed-agents-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>
    </main>
  );
}
