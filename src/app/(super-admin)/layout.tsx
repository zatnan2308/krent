import type { ReactNode } from "react";

import { SuperAdminLayout } from "@/components/layout/super-admin-layout";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/provider";
import { getRequestLocale } from "@/lib/i18n/runtime";
import { requireUser } from "@/server/auth";
import { requireSuperAdmin } from "@/server/permissions";

// Зависит от сессии и прав Super Admin — всегда динамический рендер.
export const dynamic = "force-dynamic";

export default async function SuperAdminGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  await requireSuperAdmin();
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <SuperAdminLayout userEmail={user.email ?? ""}>
        {children}
      </SuperAdminLayout>
    </I18nProvider>
  );
}
