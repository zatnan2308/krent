import { z } from "zod";

/**
 * Централизованная типобезопасная конфигурация переменных окружения.
 *
 * Граница безопасности:
 *  - getClientEnv() отдаёт только NEXT_PUBLIC_*-переменные — Next.js
 *    встраивает их в браузерный бандл, секретов в них быть не должно.
 *  - getServerEnv() отдаёт серверные секреты и бросает ошибку при вызове
 *    из браузера.
 *
 * Валидация ленивая (при первом вызове, не при импорте модуля): модуль
 * попадает в граф middleware, и next build не должен падать без .env.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Krent"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Платёжные секреты опциональны: платформа собирается и работает без
  // настроенных провайдеров. Секреты доступны только на сервере.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.enum(["sandbox", "live"]).optional(),
  // Resend — транзакционные письма; опциональны, как и платёжные секреты.
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  // CRON и шифрование — обязательны на production, проверяются на месте.
  CRON_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  // OAuth для рекламных интеграций. Если не заданы, UI показывает
  // honest «Requires API credentials» вместо fake-connect.
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URL: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_OAUTH_REDIRECT_URL: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

const skipValidation =
  process.env.SKIP_ENV_VALIDATION === "true" ||
  process.env.SKIP_ENV_VALIDATION === "1";

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

let clientEnvCache: ClientEnv | null = null;
let serverEnvCache: ServerEnv | null = null;

/** Проверенное публичное окружение — безопасно читать на клиенте и сервере. */
export function getClientEnv(): ClientEnv {
  if (clientEnvCache !== null) {
    return clientEnvCache;
  }

  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  };

  if (skipValidation) {
    clientEnvCache = {
      NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: raw.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      NEXT_PUBLIC_SITE_URL: raw.NEXT_PUBLIC_SITE_URL ?? "",
      NEXT_PUBLIC_APP_NAME: raw.NEXT_PUBLIC_APP_NAME ?? "Krent",
    };
    return clientEnvCache;
  }

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid client environment variables:\n${formatIssues(parsed.error)}`,
    );
  }

  clientEnvCache = parsed.data;
  return clientEnvCache;
}

/**
 * Проверенное серверное окружение.
 * Бросает ошибку при вызове из браузера — секреты не должны попадать
 * на клиент.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() was called in the browser. Server environment variables must not be accessed from client code.",
    );
  }

  if (serverEnvCache !== null) {
    return serverEnvCache;
  }

  const serverRaw = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
    PAYPAL_MODE: process.env.PAYPAL_MODE as "sandbox" | "live" | undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URL: process.env.GOOGLE_OAUTH_REDIRECT_URL,
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_OAUTH_REDIRECT_URL: process.env.META_OAUTH_REDIRECT_URL,
  };

  if (skipValidation) {
    serverEnvCache = serverRaw;
    return serverEnvCache;
  }

  const parsed = serverSchema.safeParse(serverRaw);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error)}`,
    );
  }

  serverEnvCache = parsed.data;
  return serverEnvCache;
}
