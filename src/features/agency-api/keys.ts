import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  API_KEY_PREFIX,
  API_KEY_RAW_BYTES,
  API_KEY_VISIBLE_PREFIX_LENGTH,
} from "./constants";

/**
 * Генерирует новый API-ключ. Сырой ключ показывается клиенту один раз
 * и нигде не сохраняется — в БД храним только sha256-хеш.
 */
export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const random = randomBytes(API_KEY_RAW_BYTES).toString("hex");
  const rawKey = `${API_KEY_PREFIX}${random}`;
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, API_KEY_VISIBLE_PREFIX_LENGTH),
  };
}

/** SHA-256 хеш ключа (hex). */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/** Безопасное сравнение хешей одинаковой длины. */
export function compareKeyHashes(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Достаёт сырой ключ из заголовка Authorization: Bearer <key> или
 * из x-api-key. Возвращает null, если ключа нет/формат битый.
 */
export function extractApiKey(headers: Headers): string | null {
  const xHeader = headers.get("x-api-key");
  if (xHeader && xHeader.startsWith(API_KEY_PREFIX)) {
    return xHeader.trim();
  }
  const auth = headers.get("authorization");
  if (!auth) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!match) {
    return null;
  }
  const value = match[1]?.trim();
  if (!value || !value.startsWith(API_KEY_PREFIX)) {
    return null;
  }
  return value;
}
