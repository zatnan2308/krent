import { sendEmail } from "@/features/notifications/email";
import { htmlToText } from "@/features/notifications/render";
import { getClientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

import {
  ensureUnsubscribeBlock,
  type PropertyEmailData,
  renderCampaignEmail,
} from "./block-renderer";
import { type BlockType, type CampaignBlockData, isBlockType } from "./blocks";
import { loadUnsubscribedEmails, loadWithdrawnContactIds } from "./consent";
import { getEmailPropertyData } from "./queries";

type Admin = ReturnType<typeof createAdminClient>;

export interface SendResult {
  ok: boolean;
  error?: string;
  sent?: number;
  skipped?: number;
  failed?: number;
}

/** Загружает блоки кампании в порядке сортировки. */
async function loadCampaignBlocks(
  admin: Admin,
  campaignId: string,
): Promise<CampaignBlockData[]> {
  const { data } = await admin
    .from("campaign_blocks")
    .select("block_type, content")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });
  return (data ?? [])
    .filter((row) => isBlockType(row.block_type))
    .map((row) => ({
      type: row.block_type as BlockType,
      content: (row.content ?? {}) as Record<string, unknown>,
    }));
}

/** Индексирует объекты по id для рендера блоков. */
function indexProperties(
  properties: PropertyEmailData[],
): Record<string, PropertyEmailData> {
  const map: Record<string, PropertyEmailData> = {};
  for (const property of properties) {
    map[property.id] = property;
  }
  return map;
}

/** Уникальный токен отписки получателя. */
function unsubscribeToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

/** Отправляет тестовое письмо кампании на указанный адрес. */
export async function sendTestEmail(
  organizationId: string,
  campaignId: string,
  testEmail: string,
): Promise<SendResult> {
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!campaign) {
    return { ok: false, error: "Campaign not found." };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();
  const companyName = org?.name ?? "";

  const blocks = ensureUnsubscribeBlock(
    await loadCampaignBlocks(admin, campaignId),
  );
  const properties = indexProperties(
    await getEmailPropertyData(admin, organizationId),
  );
  const html = renderCampaignEmail(blocks, {
    companyName,
    unsubscribeUrl: "#",
    properties,
  });

  const result = await sendEmail({
    organizationId,
    notificationEventId: null,
    templateKey: "campaign_test",
    toEmail: testEmail,
    fromName: campaign.sender_name || companyName,
    subject: `[TEST] ${campaign.subject || campaign.name}`,
    html,
    text: htmlToText(html),
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Test email failed." };
  }
  return { ok: true };
}

/**
 * Отправляет кампанию контактам сегмента. Отписавшиеся и контакты с
 * отозванным согласием пропускаются; каждое письмо несёт ссылку на
 * отписку. Итоги пишутся в campaign_recipients и campaign_reports.
 */
export async function sendCampaign(
  organizationId: string,
  campaignId: string,
): Promise<SendResult> {
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!campaign) {
    return { ok: false, error: "Campaign not found." };
  }
  if (campaign.status === "sending" || campaign.status === "sent") {
    return { ok: false, error: "This campaign has already been sent." };
  }
  if (!campaign.segment_id) {
    return { ok: false, error: "Choose an audience segment first." };
  }
  if (!campaign.subject.trim()) {
    return { ok: false, error: "Add a subject line first." };
  }

  await admin
    .from("campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  try {
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();
    const companyName = org?.name ?? "";

    const blocks = ensureUnsubscribeBlock(
      await loadCampaignBlocks(admin, campaignId),
    );
    const properties = indexProperties(
      await getEmailPropertyData(admin, organizationId),
    );

    const { data: members } = await admin
      .from("contact_segment_members")
      .select("contact_id")
      .eq("segment_id", campaign.segment_id);
    const contactIds = [
      ...new Set((members ?? []).map((row) => row.contact_id)),
    ];

    let contacts: { id: string; full_name: string; email: string | null }[] =
      [];
    if (contactIds.length > 0) {
      const { data } = await admin
        .from("contacts")
        .select("id, full_name, email")
        .in("id", contactIds);
      contacts = data ?? [];
    }

    const withdrawn = await loadWithdrawnContactIds(admin, organizationId);
    const unsubscribed = await loadUnsubscribedEmails(admin, organizationId);

    const siteUrl = getClientEnv().NEXT_PUBLIC_SITE_URL;
    const fromName = campaign.sender_name || companyName;
    const subject = campaign.subject || campaign.name;

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const seenEmails = new Set<string>();

    for (const contact of contacts) {
      const email = (contact.email ?? "").trim();
      const emailLower = email.toLowerCase();
      const token = unsubscribeToken();

      let skipReason: string | null = null;
      if (!email) {
        skipReason = "No email address.";
      } else if (seenEmails.has(emailLower)) {
        skipReason = "Duplicate email.";
      } else if (withdrawn.has(contact.id) || unsubscribed.has(emailLower)) {
        skipReason = "Unsubscribed from marketing.";
      }

      if (skipReason) {
        skipped += 1;
        await admin.from("campaign_recipients").insert({
          organization_id: organizationId,
          campaign_id: campaignId,
          contact_id: contact.id,
          email: email || "unknown",
          status: "skipped",
          reason: skipReason,
          unsubscribe_token: token,
        });
        continue;
      }

      seenEmails.add(emailLower);
      const html = renderCampaignEmail(blocks, {
        companyName,
        unsubscribeUrl: `${siteUrl}/api/marketing/unsubscribe?token=${token}`,
        properties,
      });
      const result = await sendEmail({
        organizationId,
        notificationEventId: null,
        templateKey: "campaign",
        toEmail: email,
        fromName,
        subject,
        html,
        text: htmlToText(html),
      });
      if (result.ok) {
        sent += 1;
      } else {
        failed += 1;
      }
      await admin.from("campaign_recipients").insert({
        organization_id: organizationId,
        campaign_id: campaignId,
        contact_id: contact.id,
        email,
        status: result.ok ? "sent" : "failed",
        reason: result.ok ? null : result.error,
        unsubscribe_token: token,
        email_send_id: result.emailSendId,
        sent_at: result.ok ? new Date().toISOString() : null,
      });
    }

    await admin.from("campaign_reports").upsert(
      {
        organization_id: organizationId,
        campaign_id: campaignId,
        total_recipients: contacts.length,
        sent_count: sent,
        failed_count: failed,
        skipped_count: skipped,
      },
      { onConflict: "campaign_id" },
    );

    await admin
      .from("campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", campaignId);

    return { ok: true, sent, skipped, failed };
  } catch (error) {
    await admin
      .from("campaigns")
      .update({ status: "failed" })
      .eq("id", campaignId);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Send failed.",
    };
  }
}
