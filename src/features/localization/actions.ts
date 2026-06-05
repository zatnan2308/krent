"use server";

import { cookies } from "next/headers";

import { CURRENCY_COOKIE, isCurrencyCode } from "@/lib/currency";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Запоминает предпочтённую локаль (для редиректа "/" на нужный язык). */
export async function setLocalePreference(locale: string): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }
  cookies().set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

/**
 * Гибрид-локаль для приватных зон (admin/account/portal): персональный выбор.
 * Пишет cookie (как публичный переключатель) И, если есть сессия, сохраняет
 * в user_metadata.locale — персональный override поверх cookie.
 */
export async function setUserLocalePreference(locale: string): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }
  cookies().set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.auth.updateUser({ data: { locale } });
  }
}

/** Сохраняет выбранную валюту отображения. */
export async function setCurrency(currency: string): Promise<void> {
  if (!isCurrencyCode(currency)) {
    return;
  }
  cookies().set(CURRENCY_COOKIE, currency, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}
