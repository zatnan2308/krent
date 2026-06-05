import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Нормализация телефонов в E.164 — для матчинга контактов по каналам.
 * WhatsApp Cloud присылает номер отправителя в международном формате (wa_id,
 * только цифры), поэтому при матчинге нужен единый канонический вид.
 */

/**
 * Приводит телефон к E.164 (`+971501234567`). Возвращает null, если номер
 * нераспознаваем. `defaultCountry` (ISO-2, напр. "AE") помогает для номеров,
 * введённых без кода страны.
 */
export function normalizePhoneE164(
  input: string | null | undefined,
  defaultCountry?: string,
): string | null {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  // wa_id приходит как голые цифры без "+": достроим международный префикс,
  // чтобы парсер трактовал номер как уже содержащий код страны.
  const candidate =
    !trimmed.startsWith("+") && /^[0-9][0-9\s().-]{5,}$/.test(trimmed)
      ? `+${trimmed.replace(/[^\d]/g, "")}`
      : trimmed;
  const parsed = parsePhoneNumberFromString(
    candidate,
    defaultCountry ? (defaultCountry.toUpperCase() as CountryCode) : undefined,
  );
  if (parsed && parsed.isValid()) {
    return parsed.number;
  }
  return null;
}

/** Цифры номера без «+» (формат wa_id у WhatsApp). */
export function phoneToDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}
