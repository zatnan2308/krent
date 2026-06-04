import { createNotificationEvent } from "@/features/notifications/dispatcher";
import { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;
type PortalType = "buyer" | "seller" | "guest";

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Генерирует токен приглашения в портал. */
export function generateInviteToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

/** Приводит host/URL к абсолютному базовому URL с протоколом. */
function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const isLocal =
    trimmed.startsWith("localhost") || trimmed.startsWith("127.");
  return `${isLocal ? "http" : "https"}://${trimmed}`;
}

/** Отправляет письмо-приглашение в портал с активационной ссылкой. */
export async function sendPortalInviteEmail(params: {
  organizationId: string;
  email: string;
  name: string | null;
  token: string;
  baseUrl: string;
}): Promise<void> {
  const base = normalizeBaseUrl(params.baseUrl);
  if (!base) return;
  const inviteUrl = `${base}/portal/accept?token=${params.token}`;
  await createNotificationEvent({
    organizationId: params.organizationId,
    eventType: "portal.invited",
    entityType: "portal_account",
    recipients: [{ email: params.email, name: params.name }],
    variables: { invite_url: inviteUrl },
  });
}

/**
 * Гарантирует наличие портального аккаунта нужного типа у контакта и шлёт
 * приглашение. Если аккаунт уже активен — ничего не делает. Безопасна к
 * повторному вызову (переиспользует существующий pending-аккаунт). Все ошибки
 * проглатываются — приглашение не должно ломать основной поток (бронирование).
 */
export async function ensurePortalInvite(
  admin: Admin,
  params: {
    organizationId: string;
    contactId: string;
    email: string;
    name: string | null;
    portalType: PortalType;
    invitedBy: string | null;
    baseUrl: string;
  },
): Promise<void> {
  try {
    const { data: existing } = await admin
      .from("portal_accounts")
      .select("id, status, invite_token")
      .eq("organization_id", params.organizationId)
      .eq("contact_id", params.contactId)
      .eq("portal_type", params.portalType)
      .maybeSingle();

    let token: string;
    if (existing) {
      if (existing.status === "active") {
        return; // уже активен — приглашать не нужно
      }
      token = existing.invite_token ?? generateInviteToken();
      await admin
        .from("portal_accounts")
        .update({
          invite_token: token,
          status: "pending",
          expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        })
        .eq("id", existing.id);
    } else {
      token = generateInviteToken();
      const { error } = await admin.from("portal_accounts").insert({
        organization_id: params.organizationId,
        contact_id: params.contactId,
        portal_type: params.portalType,
        email: params.email,
        invite_token: token,
        status: "pending",
        invited_by: params.invitedBy,
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      });
      if (error) {
        return;
      }
    }

    await sendPortalInviteEmail({
      organizationId: params.organizationId,
      email: params.email,
      name: params.name,
      token,
      baseUrl: params.baseUrl,
    });
  } catch {
    // Приглашение не должно ломать основной поток.
  }
}
