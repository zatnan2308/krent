"use server";

import { cookies } from "next/headers";

import { CURRENCY_COOKIE, isCurrencyCode } from "@/lib/currency";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

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
