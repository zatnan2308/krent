import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listPages } from "@/features/cms/dashboard-queries";
import { NavigationManager } from "@/features/cms/navigation-manager";
import { getNavigationItems } from "@/features/cms/navigation-queries";
import { ContentLanguageTabs } from "@/features/i18n/content-language-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import {
  getContentTranslations,
  resolveOrgLocale,
  type TranslatedFields,
} from "@/lib/i18n/content-translations";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";
import type { Tables } from "@/types/database";

export const metadata: Metadata = {
  title: "Navigation",
};

export const dynamic = "force-dynamic";

export default async function NavigationPage({
  searchParams,
}: {
  searchParams?: { lang?: string | string[] };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "navigation.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const org = context.organization;
  const orgId = org.id;
  const def = org.default_language;
  const languages = Array.from(
    new Set([def, ...(org.enabled_languages ?? [])]),
  );
  const langParam =
    typeof searchParams?.lang === "string" ? searchParams.lang : undefined;
  const selected = resolveOrgLocale(org, langParam);
  const isDefault = selected === def;

  const [header, footer, footerBrowse, footerAreas, footerLegal, pageList] =
    await Promise.all([
      getNavigationItems(orgId, "header"),
      getNavigationItems(orgId, "footer"),
      getNavigationItems(orgId, "footer_browse"),
      getNavigationItems(orgId, "footer_areas"),
      getNavigationItems(orgId, "footer_legal"),
      listPages(orgId, def),
    ]);

  // В режиме перевода накладываем СЫРОЙ перевод label (пусто — если нет).
  const navTr: Map<string, TranslatedFields> = isDefault
    ? new Map()
    : await getContentTranslations(orgId, "nav_item", selected, def);
  const tlabel = (
    items: Tables<"navigation_items">[],
  ): Tables<"navigation_items">[] =>
    isDefault
      ? items
      : items.map((i) => ({
          ...i,
          label: (navTr.get(i.id)?.label as string | undefined) ?? "",
        }));

  const pages = pageList
    .filter((page) => page.status === "published")
    .map((page) => ({ id: page.id, label: page.title }));
  const dict = await getServerDictionary();
  const t = dict.dashNavigation;

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.navigation}
        description={t.description.replace("{name}", org.name)}
      />
      <ContentLanguageTabs
        languages={languages}
        current={selected}
        defaultLocale={def}
      />
      <NavigationManager
        key={selected}
        header={tlabel(header)}
        footer={tlabel(footer)}
        footerBrowse={tlabel(footerBrowse)}
        footerAreas={tlabel(footerAreas)}
        footerLegal={tlabel(footerLegal)}
        pages={pages}
        locale={selected}
        isDefault={isDefault}
      />
    </div>
  );
}
