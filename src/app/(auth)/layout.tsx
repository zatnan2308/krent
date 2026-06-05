import type { ReactNode } from "react";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/provider";
import { getRequestLocale } from "@/lib/i18n/runtime";

/** Auth-страницы используют собственный полноэкранный split-screen (AuthShell),
 *  поэтому здесь только editorial-скоуп токенов + фон. I18nProvider даёт словарь
 *  клиентским формам входа; локаль берётся из cookie (пользователь ещё не вошёл). */
export default async function AuthGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <div
        className="editorial"
        style={{ minHeight: "100vh", background: "var(--bg-primary)" }}
      >
        <div className="grain" />
        {children}
      </div>
    </I18nProvider>
  );
}
