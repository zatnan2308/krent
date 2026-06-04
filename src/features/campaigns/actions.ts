"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";
import type { Json } from "@/types/database";

import { setMarketingConsent } from "./consent";
import {
  createSegmentSchema,
  saveCampaignBlocksSchema,
  saveCampaignSchema,
  scheduleCampaignSchema,
  sendTestSchema,
  type ActionResult,
  type CreateSegmentInput,
  type SaveCampaignBlocksInput,
  type SaveCampaignInput,
  type ScheduleCampaignInput,
  type SendTestInput,
} from "./schema";
import { materializeSegment, refreshSegmentMembers } from "./segments";
import { sendCampaign, sendTestEmail } from "./send";

/** Гард: активная организация + право marketing.manage. */
async function requireMarketingAccess(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "marketing.manage")) {
    return {
      ok: false,
      error: "You do not have permission to manage marketing.",
    };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

/** Проверяет принадлежность кампании организации. */
async function ownsCampaign(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  campaignId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data !== null;
}

/**
 * Создаёт черновик кампании из системного шаблона и открывает редактор.
 * Используется как form action на странице маркетинга.
 */
export async function createCampaignAction(
  formData: FormData,
): Promise<void> {
  const access = await requireMarketingAccess();
  if (!access.ok) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const templateId = formData.get("templateId");
  let name = "New campaign";
  let blocks: unknown[] = [];
  if (typeof templateId === "string" && templateId) {
    const { data: template } = await admin
      .from("campaign_templates")
      .select("name, blocks")
      .eq("id", templateId)
      .maybeSingle();
    if (template) {
      name = template.name;
      blocks = Array.isArray(template.blocks) ? template.blocks : [];
    }
  }

  const { data: campaign } = await admin
    .from("campaigns")
    .insert({
      organization_id: access.organizationId,
      name,
      created_by: access.userId,
    })
    .select("id")
    .single();
  if (!campaign) {
    redirect("/dashboard/marketing");
  }

  if (blocks.length > 0) {
    const blockRows = blocks.map((block, index) => {
      const data = (block ?? {}) as Record<string, unknown>;
      return {
        organization_id: access.organizationId,
        campaign_id: campaign.id,
        sort_order: index,
        block_type: typeof data.type === "string" ? data.type : "text",
        content: (data.content ?? {}) as Json,
      };
    });
    await admin.from("campaign_blocks").insert(blockRows);
  }

  revalidatePath("/dashboard/marketing");
  redirect(`/dashboard/marketing/campaigns/${campaign.id}`);
}

/** Сохраняет метаданные кампании. */
export async function saveCampaign(
  input: SaveCampaignInput,
): Promise<ActionResult> {
  const parsed = saveCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the campaign fields." };
  }
  const data = parsed.data;
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  if (!(await ownsCampaign(admin, access.organizationId, data.campaignId))) {
    return { ok: false, error: "Campaign not found." };
  }

  const { error } = await admin
    .from("campaigns")
    .update({
      name: data.name,
      subject: data.subject,
      preview_text: data.previewText,
      language: data.language,
      sender_name: data.senderName,
      segment_id: data.segmentId,
    })
    .eq("id", data.campaignId);
  if (error) {
    return { ok: false, error: "Could not save the campaign." };
  }

  revalidatePath(`/dashboard/marketing/campaigns/${data.campaignId}`);
  revalidatePath("/dashboard/marketing");
  return { ok: true };
}

/** Сохраняет блоки письма кампании (полная замена). */
export async function saveCampaignBlocks(
  input: SaveCampaignBlocksInput,
): Promise<ActionResult> {
  const parsed = saveCampaignBlocksSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Could not save the email blocks." };
  }
  const data = parsed.data;
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  if (!(await ownsCampaign(admin, access.organizationId, data.campaignId))) {
    return { ok: false, error: "Campaign not found." };
  }

  await admin
    .from("campaign_blocks")
    .delete()
    .eq("campaign_id", data.campaignId);
  if (data.blocks.length > 0) {
    const { error } = await admin.from("campaign_blocks").insert(
      data.blocks.map((block, index) => ({
        organization_id: access.organizationId,
        campaign_id: data.campaignId,
        sort_order: index,
        block_type: block.type,
        content: block.content as Json,
      })),
    );
    if (error) {
      return { ok: false, error: "Could not save the email blocks." };
    }
  }

  revalidatePath(`/dashboard/marketing/campaigns/${data.campaignId}`);
  return { ok: true };
}

/** Отправляет тестовое письмо кампании. */
export async function sendTest(input: SendTestInput): Promise<ActionResult> {
  const parsed = sendTestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid test email address." };
  }
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }
  const result = await sendTestEmail(
    access.organizationId,
    parsed.data.campaignId,
    parsed.data.email,
  );
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Test email failed." };
  }
  return { ok: true };
}

/** Отправляет кампанию по сегменту прямо сейчас. */
export async function sendCampaignNow(
  campaignId: string,
): Promise<ActionResult> {
  if (!z.guid().safeParse(campaignId).success) {
    return { ok: false, error: "Invalid campaign." };
  }
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }
  const result = await sendCampaign(access.organizationId, campaignId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the campaign." };
  }
  revalidatePath(`/dashboard/marketing/campaigns/${campaignId}`);
  revalidatePath("/dashboard/marketing");
  return { ok: true };
}

/**
 * Планирует кампанию: ставит status='scheduled' и scheduled_at. Cron-эндпоинт
 * /api/cron/campaigns-dispatch отправляет такие кампании по наступлении времени.
 */
export async function scheduleCampaign(
  input: ScheduleCampaignInput,
): Promise<ActionResult> {
  const parsed = scheduleCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose a valid date and time." };
  }
  const data = parsed.data;
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  if (!(await ownsCampaign(admin, access.organizationId, data.campaignId))) {
    return { ok: false, error: "Campaign not found." };
  }

  const { error } = await admin
    .from("campaigns")
    .update({ status: "scheduled", scheduled_at: data.scheduledAt })
    .eq("id", data.campaignId);
  if (error) {
    return { ok: false, error: "Could not schedule the campaign." };
  }

  revalidatePath(`/dashboard/marketing/campaigns/${data.campaignId}`);
  return { ok: true };
}

/** Создаёт сегмент контактов и наполняет его состав. */
export async function createSegment(
  input: CreateSegmentInput,
): Promise<ActionResult> {
  const parsed = createSegmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the segment fields." };
  }
  const data = parsed.data;
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: segment, error } = await admin
    .from("contact_segments")
    .insert({
      organization_id: access.organizationId,
      name: data.name,
      description: data.description,
      definition: { rule: data.rule, value: data.value },
    })
    .select("id, organization_id, definition")
    .single();
  if (error || !segment) {
    return { ok: false, error: "Could not create the segment." };
  }

  await materializeSegment(admin, segment);
  revalidatePath("/dashboard/marketing/segments");
  return { ok: true };
}

/** Пересобирает состав сегмента. */
export async function refreshSegment(
  segmentId: string,
): Promise<ActionResult> {
  if (!z.guid().safeParse(segmentId).success) {
    return { ok: false, error: "Invalid segment." };
  }
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }
  const ok = await refreshSegmentMembers(access.organizationId, segmentId);
  if (!ok) {
    return { ok: false, error: "Segment not found." };
  }
  revalidatePath("/dashboard/marketing/segments");
  return { ok: true };
}

/** Удаляет пользовательский сегмент (системные удалять нельзя). */
export async function deleteSegment(
  segmentId: string,
): Promise<ActionResult> {
  if (!z.guid().safeParse(segmentId).success) {
    return { ok: false, error: "Invalid segment." };
  }
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: segment } = await admin
    .from("contact_segments")
    .select("id, is_system")
    .eq("id", segmentId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!segment) {
    return { ok: false, error: "Segment not found." };
  }
  if (segment.is_system) {
    return { ok: false, error: "System segments cannot be deleted." };
  }

  await admin.from("contact_segments").delete().eq("id", segmentId);
  revalidatePath("/dashboard/marketing/segments");
  return { ok: true };
}

/** Включает или отзывает согласие контакта на маркетинг. */
export async function setContactConsentAction(
  contactId: string,
  granted: boolean,
): Promise<ActionResult> {
  if (!z.guid().safeParse(contactId).success) {
    return { ok: false, error: "Invalid contact." };
  }
  const access = await requireMarketingAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!contact) {
    return { ok: false, error: "Contact not found." };
  }

  await setMarketingConsent(
    admin,
    access.organizationId,
    contactId,
    granted,
    "dashboard",
  );
  if (granted) {
    // Возврат подписки очищает контакт из списка отписок.
    await admin
      .from("email_unsubscribes")
      .delete()
      .eq("organization_id", access.organizationId)
      .eq("contact_id", contactId);
  }

  revalidatePath("/dashboard/marketing/contacts");
  return { ok: true };
}
