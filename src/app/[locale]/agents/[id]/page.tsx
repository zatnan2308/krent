import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";

import { getPublicAgent } from "@/features/agents/queries";
import { JsonLd } from "@/features/seo/json-ld";
import {
  breadcrumbJsonLd,
  realEstateAgentJsonLd,
} from "@/features/seo/jsonld";
import { Card, CardContent } from "@/components/ui/card";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
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
  params: { locale: string; id: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    return {};
  }
  const agent = await getPublicAgent(site.organization.id, params.id);
  if (!agent) {
    return {};
  }
  const title = `${agent.name} — ${site.organization.name}`;
  return {
    title,
    description: `Property listings by ${agent.name} at ${site.organization.name}.`,
    alternates: buildLocaleAlternates(locale, `/agents/${agent.id}`),
    openGraph: { title },
  };
}

export default async function AgentProfilePage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }
  const agent = await getPublicAgent(site.organization.id, params.id);
  if (!agent) {
    notFound();
  }

  const url = buildCanonicalUrl(locale, `/agents/${agent.id}`);
  const jsonLd = [
    realEstateAgentJsonLd({
      name: agent.name,
      url,
      imageUrl: agent.photoUrl,
      description: `${agent.name} — property agent at ${site.organization.name}.`,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: buildCanonicalUrl(locale, "/") },
      { name: "Agents", url: buildCanonicalUrl(locale, "/agents") },
      { name: agent.name, url },
    ]),
  ];

  return (
    <section className="container space-y-8 py-12">
      <JsonLd data={jsonLd} />

      <Link
        href={`/${locale}/agents`}
        className="text-sm text-muted-foreground hover:underline"
      >
        &larr; All agents
      </Link>

      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold">
          {initials(agent.name)}
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
          <p className="text-muted-foreground">
            {agent.listings.length} active listing(s) ·{" "}
            {site.organization.name}
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Listings by {agent.name}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agent.listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/${locale}/properties/${listing.slug}`}
            >
              <Card className="h-full overflow-hidden transition-colors hover:border-primary">
                <div className="relative aspect-[4/3] bg-muted">
                  {listing.coverImageUrl ? (
                    <Image
                      src={listing.coverImageUrl}
                      alt={listing.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 350px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Building2 className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <CardContent className="pt-4">
                  <p className="font-medium">{listing.title}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
