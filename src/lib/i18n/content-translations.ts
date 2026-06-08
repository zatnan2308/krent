import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * SERVER-ONLY. Универсальный стор переводов контента (Этап 5 i18n).
 *
 * Базовые контент-таблицы (legal_documents, about_page, page_intros,
 * home_*, navigation_items, amenities, ...) хранят контент на языке по
 * умолчанию организации. Дополнительные языки лежат оверлеем в
 * public.content_translations: (entity_type, entity_key) адресуют строку
 * базовой таблицы, fields — jsonb переводимых полей.
 *
 * Чтение: получаем карту переводов для (entity_type, locale) и
 * накладываем на базовые строки через {@link tr} (field-level fallback:
 * пустой/отсутствующий перевод → значение из базы).
 */
export type TranslatedFields = Record<string, string | null | undefined>;

/**
 * Валидирует целевую локаль контента против организации: возвращает её,
 * только если это язык по умолчанию или один из включённых; иначе —
 * язык по умолчанию (защита от записи перевода в непредусмотренный язык).
 */
export function resolveOrgLocale(
  org: { default_language: string; enabled_languages: string[] | null },
  locale: string | null | undefined,
): string {
  const def = org.default_language;
  if (!locale || locale === def) {
    return def;
  }
  return (org.enabled_languages ?? []).includes(locale) ? locale : def;
}

/**
 * Карта переводов одного домена для локали: entity_key → поля.
 * При locale === defaultLocale возвращает пустую карту без запроса к БД
 * (базовые строки уже на языке по умолчанию).
 */
export async function getContentTranslations(
  organizationId: string,
  entityType: string,
  locale: string,
  defaultLocale: string,
): Promise<Map<string, TranslatedFields>> {
  const map = new Map<string, TranslatedFields>();
  if (!locale || locale === defaultLocale) {
    return map;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("content_translations")
    .select("entity_key, fields")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("locale", locale);
  for (const row of data ?? []) {
    map.set(row.entity_key, (row.fields ?? {}) as TranslatedFields);
  }
  return map;
}

/** Поля перевода для entity_key (или пустой объект, если перевода нет). */
export function fieldsFor(
  map: Map<string, TranslatedFields>,
  entityKey: string,
): TranslatedFields {
  return map.get(entityKey) ?? {};
}

/**
 * Накладывает перевод на базовое значение. Пустой или отсутствующий
 * перевод → возвращаем базу (язык по умолчанию).
 */
export function tr(
  base: string | null,
  translated: string | null | undefined,
): string | null {
  if (typeof translated === "string" && translated.trim() !== "") {
    return translated;
  }
  return base;
}

/**
 * Сохраняет перевод строки (upsert по полному ключу). fields —
 * объект только переводимых полей (например {title, body}).
 */
export async function saveContentTranslation(
  organizationId: string,
  entityType: string,
  entityKey: string,
  locale: string,
  fields: Record<string, string | null>,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("content_translations").upsert(
    {
      organization_id: organizationId,
      entity_type: entityType,
      entity_key: entityKey,
      locale,
      fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,entity_type,entity_key,locale" },
  );
  return !error;
}

/**
 * Удаляет ВСЕ переводы строки (все локали) — вызывать при удалении
 * базовой строки (например, вехи about), чтобы не копились сироты.
 */
export async function deleteContentTranslations(
  organizationId: string,
  entityType: string,
  entityKey: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("content_translations")
    .delete()
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey);
}
