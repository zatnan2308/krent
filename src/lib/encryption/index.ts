import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { getServerEnv } from "@/lib/env";

/**
 * AES-256-GCM шифрование секретов интеграций (OAuth-токены,
 * webhook secrets и т.п.).
 *
 * Формат шифротекста: `krent_enc_v1:<base64(iv)>:<base64(tag)>:<base64(ciphertext)>`.
 * Ключ берётся из ENCRYPTION_KEY (hex или base64, 32 байта). Если
 * ключ не задан, шифрование выполняет fallback в plain base64 с
 * префиксом `krent_pt_` — это поддерживает dev-режим без секретов, но
 * **production-установка должна задать ENCRYPTION_KEY**.
 */

const AES_PREFIX = "krent_enc_v1:";
const PLACEHOLDER_PREFIX = "krent_pt_";
const ALGO = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function getKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const raw = getServerEnv().ENCRYPTION_KEY;
  if (!raw) return null;
  // Пробуем сначала hex, потом base64.
  try {
    const fromHex = Buffer.from(raw, "hex");
    if (fromHex.length === KEY_BYTES) {
      cachedKey = fromHex;
      return cachedKey;
    }
  } catch {
    // ignore
  }
  try {
    const fromB64 = Buffer.from(raw, "base64");
    if (fromB64.length === KEY_BYTES) {
      cachedKey = fromB64;
      return cachedKey;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Шифрует значение токена AES-256-GCM либо fallback в base64 (dev only). */
export function encryptToken(value: string): string {
  if (!value) {
    return "";
  }
  const key = getKey();
  if (!key) {
    return PLACEHOLDER_PREFIX + Buffer.from(value, "utf8").toString("base64");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    AES_PREFIX,
    iv.toString("base64"),
    ":",
    tag.toString("base64"),
    ":",
    encrypted.toString("base64"),
  ].join("");
}

/** Расшифровывает значение токена. Поддерживает legacy placeholder. */
export function decryptToken(value: string): string {
  if (!value) {
    return "";
  }
  if (value.startsWith(PLACEHOLDER_PREFIX)) {
    try {
      return Buffer.from(
        value.slice(PLACEHOLDER_PREFIX.length),
        "base64",
      ).toString("utf8");
    } catch {
      return "";
    }
  }
  if (!value.startsWith(AES_PREFIX)) {
    return value;
  }
  const key = getKey();
  if (!key) {
    return "";
  }
  const parts = value.slice(AES_PREFIX.length).split(":");
  if (parts.length !== 3) {
    return "";
  }
  const [ivB64, tagB64, dataB64] = parts;
  if (!ivB64 || !tagB64 || !dataB64) {
    return "";
  }
  try {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

/** True, если в установке настроен боевой ENCRYPTION_KEY. */
export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}
