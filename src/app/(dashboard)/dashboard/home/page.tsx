import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { HomeEditor } from "@/features/home/home-editor";
import {
  applyHomeTranslations,
  getHomeContent,
  getHomeTranslationMap,
} from "@/features/home/queries";
import { ContentLanguageTabs } from "@/features/i18n/content-language-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { resolveOrgLocale } from "@/lib/i18n/content-translations";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Home page",
};

export const dynamic = "force-dynamic";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams?: { lang?: string | string[] };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  // Право `branding.manage` уже даёт доступ к редактированию логотипа,
  // цветов и т.п. — логично использовать его и для контента главной.
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

  // База (язык по умолчанию) — структура + дефолтные тексты.
  const base = await getHomeContent(org.id, def, def);
  // В режиме перевода накладываем СЫРЬЁ (пустые поля видны, чтобы их заполнить).
  const content = isDefault
    ? base
    : applyHomeTranslations(
        base,
        await getHomeTranslationMap(org.id, selected, def),
        "editor",
      );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home page"
        description={`Edit the content shown on the public home page of ${org.name}. Changes appear on the live site immediately after save.`}
        actions={
          <a
            href={`/${selected}`}
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
      <HomeEditor
        key={selected}
        content={content}
        locale={selected}
        isDefault={isDefault}
      />
    </div>
  );
}
