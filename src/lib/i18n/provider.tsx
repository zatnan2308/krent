"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Провайдер словаря/локали для КЛИЕНТСКИХ компонентов приватных зон
 * (у них нет [locale] в URL). Server-layout вычисляет locale+dictionary
 * (getRequestLocale/getServerDictionary) и передаёт сюда.
 */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, dict: dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Доступ к словарю и локали в клиентских компонентах приватных зон. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}
