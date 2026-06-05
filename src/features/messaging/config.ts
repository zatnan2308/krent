import { getServerEnv } from "@/lib/env";

import type { MessagingChannel } from "./types";

/**
 * Конфигурация каналов мессенджеров из переменных окружения.
 *
 * Self-hosted модель: каждая копия Krent подключает СВОИ аккаунты. Секреты
 * (токены, app secret) читаются ТОЛЬКО на сервере из env — никакого Embedded
 * Signup / Tech Provider, ничего не уходит в браузер. Канал считается
 * настроенным, если заданы обязательные переменные; иначе UI честно
 * показывает «not configured». Версию Graph API покупатель держит актуальной.
 */

const DEFAULT_GRAPH_VERSION = "v23.0";

export function getGraphVersion(): string {
  return getServerEnv().META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  wabaId: string | null;
  accessToken: string;
  appSecret: string | null;
  verifyToken: string | null;
  graphVersion: string;
  /** Имя одобренного шаблона подтверждения брони (или null). */
  bookingTemplate: string | null;
  /** Язык booking-шаблона (дефолт en_US). */
  bookingTemplateLang: string;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const env = getServerEnv();
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    return null;
  }
  return {
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    wabaId: env.WHATSAPP_WABA_ID ?? null,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET ?? null,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN ?? null,
    graphVersion: getGraphVersion(),
    bookingTemplate: env.WHATSAPP_BOOKING_TEMPLATE ?? null,
    bookingTemplateLang: env.WHATSAPP_BOOKING_TEMPLATE_LANG || "en_US",
  };
}

export interface TelegramConfig {
  botToken: string;
  webhookSecret: string | null;
}

export function getTelegramConfig(): TelegramConfig | null {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN) {
    return null;
  }
  return {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET ?? null,
  };
}

export interface MessengerConfig {
  pageId: string;
  pageAccessToken: string;
  appSecret: string | null;
  verifyToken: string | null;
  graphVersion: string;
}

export function getMessengerConfig(): MessengerConfig | null {
  const env = getServerEnv();
  if (!env.MESSENGER_PAGE_ID || !env.MESSENGER_PAGE_ACCESS_TOKEN) {
    return null;
  }
  return {
    pageId: env.MESSENGER_PAGE_ID,
    pageAccessToken: env.MESSENGER_PAGE_ACCESS_TOKEN,
    appSecret: env.MESSENGER_APP_SECRET ?? null,
    verifyToken: env.MESSENGER_VERIFY_TOKEN ?? null,
    graphVersion: getGraphVersion(),
  };
}

/** Настроен ли канал (есть ли обязательные env-секреты). */
export function isChannelConfigured(channel: MessagingChannel): boolean {
  switch (channel) {
    case "whatsapp_cloud":
      return getWhatsAppConfig() !== null;
    case "telegram":
      return getTelegramConfig() !== null;
    case "messenger":
      return getMessengerConfig() !== null;
    default:
      return false;
  }
}
