import type { Locale } from "@/lib/i18n";

import { de } from "./de";
import { en, type DeepPartial, type Dictionary } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ru } from "./ru";
import { uk } from "./uk";

/** Простой объект (не массив, не null) — для рекурсивного слияния. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Глубокое слияние частичного перевода поверх базового (английского). */
function mergeDict<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) {
    return base;
  }
  const out = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(override)) {
    const o = (override as Record<string, unknown>)[key];
    if (o === undefined) {
      continue;
    }
    const b = (base as Record<string, unknown>)[key];
    out[key] =
      isPlainObject(b) && isPlainObject(o)
        ? mergeDict(b, o as DeepPartial<typeof b>)
        : o;
  }
  return out as T;
}

// Переводы локалей НЕполные — недостающие ключи берём из английского.
// Слитые словари считаются один раз при загрузке модуля (нулевая цена на запрос).
const dictionaries: Record<Locale, Dictionary> = {
  en,
  ru: mergeDict(en, ru),
  uk: mergeDict(en, uk),
  fr: mergeDict(en, fr),
  es: mergeDict(en, es),
  de: mergeDict(en, de),
};

/** Возвращает полный серверный словарь UI для локали (fallback — английский). */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

export type { Dictionary };
