import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AboutEditor } from "@/features/about/about-editor";
import { getAboutContent } from "@/features/about/queries";
import { ContentLanguageTabs } from "@/features/i18n/content-language-tabs";
import { LegalEditor } from "@/features/legal/legal-editor";
import { getLegalDocuments } from "@/features/legal/queries";
import { PageIntrosEditor } from "@/features/page-intros/page-intros-editor";
import { getPageIntros } from "@/features/page-intros/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import {
  fieldsFor,
  getContentTranslations,
  resolveOrgLocale,
  type TranslatedFields,
} from "@/lib/i18n/content-translations";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "About page",
};

export const dynamic = "force-dynamic";

export default async function AboutEditorPage({
  searchParams,
}: {
  searchParams?: { lang?: string | string[] };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  // Все Save на этой странице требуют branding.manage (как и Home) — гейтим
  // страницу тем же правом, чтобы видимость совпадала с редактируемостью.
  if (!hasPermission(context, "branding.manage")) {
    redirect(ROUTES.dashboard.root);
  }
  const org = context.organization;
  const def = org.default_language;
  const languages = Array.from(
    new Set([def, ...(org.enabled_languages ?? [])]),
  );
  const langParam =
    typeof searchParams?.lang === "string" ? searchParams.lang : undefined;
  const selected = resolveOrgLocale(org, langParam);
  const isDefault = selected === def;

  // Базовый контент (язык по умолчанию): структура вех + дефолтные значения.
  const [content, intros, legal] = await Promise.all([
    getAboutContent(org.id, def, def),
    getPageIntros(org.id, def, def),
    getLegalDocuments(org.id, def, def),
  ]);

  // Сырые переводы выбранной локали (в дефолте — пусто, редактируется база).
  let aboutPageTr: TranslatedFields = {};
  let milestoneTrMap = new Map<string, TranslatedFields>();
  let introTrMap = new Map<string, TranslatedFields>();
  let legalTrMap = new Map<string, TranslatedFields>();
  if (!isDefault) {
    const [ap, ms, intro, lg] = await Promise.all([
      getContentTranslations(org.id, "about_page", selected, def),
      getContentTranslations(org.id, "about_milestone", selected, def),
      getContentTranslations(org.id, "page_intro", selected, def),
      getContentTranslations(org.id, "legal_document", selected, def),
    ]);
    aboutPageTr = fieldsFor(ap, "");
    milestoneTrMap = ms;
    introTrMap = intro;
    legalTrMap = lg;
  }

  const emptyIntro = { eyebrow: null, heading: null, subheading: null };
  const emptyDoc = { title: null, body: null };

  // Значения about-страницы: база в дефолте, иначе сырой перевод.
  const aboutPageValues = {
    heroTitle: isDefault
      ? content.page?.hero_title ?? null
      : aboutPageTr.hero_title ?? null,
    storyHeading: isDefault
      ? content.page?.story_heading ?? null
      : aboutPageTr.story_heading ?? null,
    storyBody: isDefault
      ? content.page?.story_body ?? null
      : aboutPageTr.story_body ?? null,
    quote1: isDefault
      ? content.page?.quote_1 ?? null
      : aboutPageTr.quote_1 ?? null,
    quote2: isDefault
      ? content.page?.quote_2 ?? null
      : aboutPageTr.quote_2 ?? null,
  };

  const milestoneTranslations: Record<
    string,
    { year: string | null; title: string | null; body: string | null }
  > = {};
  for (const [id, f] of milestoneTrMap) {
    milestoneTranslations[id] = {
      year: f.year ?? null,
      title: f.title ?? null,
      body: f.body ?? null,
    };
  }

  const introValue = (pageKey: string) => {
    if (isDefault) return intros[pageKey] ?? emptyIntro;
    const f = introTrMap.get(pageKey) ?? {};
    return {
      eyebrow: f.eyebrow ?? null,
      heading: f.heading ?? null,
      subheading: f.subheading ?? null,
    };
  };

  const legalValue = (docKey: string) => {
    if (isDefault) return legal[docKey] ?? emptyDoc;
    const f = legalTrMap.get(docKey) ?? {};
    return { title: f.title ?? null, body: f.body ?? null };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="About page"
        description="Edit the public /about page — hero, story and the timeline of milestones."
        actions={
          <a
            href={`/${selected}/about`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            View page
          </a>
        }
      />
      <ContentLanguageTabs
        languages={languages}
        current={selected}
        defaultLocale={def}
      />
      <AboutEditor
        key={`about-${selected}`}
        page={aboutPageValues}
        milestones={content.milestones}
        locale={selected}
        isDefault={isDefault}
        milestoneTranslations={milestoneTranslations}
      />
      <PageIntrosEditor
        key={`intros-${selected}`}
        locale={selected}
        intros={[
          {
            pageKey: "sell",
            label: "Sell page",
            value: introValue("sell"),
          },
          {
            pageKey: "agents",
            label: "Agents page",
            value: introValue("agents"),
          },
        ]}
      />
      <LegalEditor
        key={`legal-${selected}`}
        locale={selected}
        docs={[
          {
            docKey: "privacy",
            label: "Privacy policy",
            value: legalValue("privacy"),
          },
          {
            docKey: "terms",
            label: "Terms of service",
            value: legalValue("terms"),
          },
          {
            docKey: "cookies",
            label: "Cookies",
            value: legalValue("cookies"),
          },
        ]}
      />
    </div>
  );
}
