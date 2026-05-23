import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listPublicAgents } from "@/features/agents/queries";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildLocaleAlternates } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

/** Инициалы для аватара-заглушки. */
function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "A";
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  const title = site
    ? `Our agents — ${site.organization.name}`
    : "Our agents";
  return {
    title,
    description: site
      ? `Meet the property experts at ${site.organization.name}.`
      : undefined,
    alternates: buildLocaleAlternates(locale, "/agents"),
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
  const agents = await listPublicAgents(site.organization.id);

  return (
    <section className="container space-y-8 py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Our agents
        </h1>
        <p className="mt-2 text-muted-foreground">
          Property experts at {site.organization.name}.
        </p>
      </header>

      {agents.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/${locale}/agents/${agent.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="flex items-center gap-3 pt-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {initials(agent.name)}
                  </span>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.listingCount} active listing(s)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No agents yet"
          description="Agent profiles will appear here once listings are assigned."
        />
      )}
    </section>
  );
}
