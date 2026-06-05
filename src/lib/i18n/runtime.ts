import { cookies } from "next/headers";
import { cache } from "react";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { getCurrentUserShallow } from "@/server/auth";

/**
 * SERVER-ONLY. Локаль приватных зон (admin/account/portal/auth — без [locale]
 * в URL): ГИБРИД. Приоритет:
 *   1) персональный выбор пользователя — user_metadata.locale;
 *   2) cookie krent_locale (общий с публичным сайтом, ставит переключатель);
 *   3) дефолтная локаль платформы.
 * Закэширована per-request (cache()), getCurrentUserShallow читает JWT из
 * cookie без сетевого вызова — лишних round-trip нет.
 */
export const getRequestLocale = cache(
  async function getRequestLocaleImpl(): Promise<Locale> {
    const user = await getCurrentUserShallow();
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const personal = meta.locale;
    if (typeof personal === "string" && isLocale(personal)) {
      return personal;
    }
    const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
    if (cookieLocale && isLocale(cookieLocale)) {
      return cookieLocale;
    }
    return DEFAULT_LOCALE;
  },
);

/** Серверный словарь UI для текущей приватной локали (fallback — английский). */
export async function getServerDictionary(): Promise<Dictionary> {
  return getDictionary(await getRequestLocale());
}
