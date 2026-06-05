import type { Locale } from "@/lib/i18n";

import { de } from "./de";
import { en, type Dictionary } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ru } from "./ru";
import { uk } from "./uk";

const dictionaries: Record<Locale, Dictionary> = { en, fr, es, uk, ru, de };

/** Возвращает серверный словарь UI для локали (fallback — английский). */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

export type { Dictionary };
