import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AboutEditor } from "@/features/about/about-editor";
import { getAboutContent } from "@/features/about/queries";
import { LegalEditor } from "@/features/legal/legal-editor";
import { getLegalDocuments } from "@/features/legal/queries";
import { PageIntrosEditor } from "@/features/page-intros/page-intros-editor";
import { getPageIntros } from "@/features/page-intros/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "About page",
};

export const dynamic = "force-dynamic";

export default async function AboutEditorPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  // Все Save на этой странице требуют branding.manage (как и Home) — гейтим
  // страницу тем же правом, чтобы видимость совпадала с редактируемостью.
  if (!hasPermission(context, "branding.manage")) {
    redirect(ROUTES.dashboard.root);
  }
  const [content, intros, legal] = await Promise.all([
    getAboutContent(context.organization.id),
    getPageIntros(context.organization.id),
    getLegalDocuments(context.organization.id),
  ]);
  const emptyIntro = { eyebrow: null, heading: null, subheading: null };
  const emptyDoc = { title: null, body: null };

  return (
    <div className="space-y-6">
      <PageHeader
        title="About page"
        description="Edit the public /about page — hero, story and the timeline of milestones."
        actions={
          <a
            href={`/${context.organization.default_language}/about`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            View page
          </a>
        }
      />
      <AboutEditor
        page={{
          heroTitle: content.page?.hero_title ?? null,
          storyHeading: content.page?.story_heading ?? null,
          storyBody: content.page?.story_body ?? null,
          quote1: content.page?.quote_1 ?? null,
          quote2: content.page?.quote_2 ?? null,
        }}
        milestones={content.milestones}
      />
      <PageIntrosEditor
        intros={[
          {
            pageKey: "sell",
            label: "Sell page",
            value: intros.sell ?? emptyIntro,
          },
          {
            pageKey: "agents",
            label: "Agents page",
            value: intros.agents ?? emptyIntro,
          },
        ]}
      />
      <LegalEditor
        docs={[
          {
            docKey: "privacy",
            label: "Privacy policy",
            value: legal.privacy ?? emptyDoc,
          },
          {
            docKey: "terms",
            label: "Terms of service",
            value: legal.terms ?? emptyDoc,
          },
          {
            docKey: "cookies",
            label: "Cookies",
            value: legal.cookies ?? emptyDoc,
          },
        ]}
      />
    </div>
  );
}
