import type { PropertyEmailData } from "@/features/campaigns/block-renderer";
import { getClientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

import { type BlockType, type CampaignBlockData, isBlockType } from "./blocks";
import { loadUnsubscribedEmails } from "./consent";
import { parseDefinition } from "./segments";
import type { Campaign, CampaignReport, CampaignStatus } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/** Денежное форматирование цены объекта для письма. */
function priceLabel(
  amount: number,
  currency: string,
  period: string,
): string {
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    formatted = `${amount} ${currency}`;
  }
  const suffix =
    period === "month"
      ? " / month"
      : period === "week"
        ? " / week"
        : period === "night"
          ? " / night"
          : "";
  return `${formatted}${suffix}`;
}

/** Данные активных объектов организации для блоков письма. */
export async function getEmailPropertyData(
  admin: Admin,
  organizationId: string,
): Promise<PropertyEmailData[]> {
  const { data: properties } = await admin
    .from("properties")
    .select("id, title, slug")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = properties ?? [];
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [pricesResult, mediaResult] = await Promise.all([
    admin
      .from("property_prices")
      .select("property_id, amount, currency, price_period, display_type")
      .in("property_id", ids),
    admin
      .from("property_media")
      .select("property_id, url, category, sort_order")
      .in("property_id", ids)
      .order("sort_order", { ascending: true }),
  ]);
  const prices = pricesResult.data ?? [];
  const media = mediaResult.data ?? [];
  const siteUrl = getClientEnv().NEXT_PUBLIC_SITE_URL;

  return rows.map((row) => {
    const price = prices.find((item) => item.property_id === row.id);
    const propertyMedia = media.filter((item) => item.property_id === row.id);
    const cover =
      propertyMedia.find((item) => item.category === "cover") ??
      propertyMedia[0];
    const priceText =
      price && price.display_type === "visible"
        ? priceLabel(price.amount, price.currency, price.price_period)
        : "";
    return {
      id: row.id,
      title: row.title,
      priceText,
      imageUrl: cover?.url ?? "",
      url: `${siteUrl}/properties/${row.slug}`,
    };
  });
}

// ---- Кампании -------------------------------------------------

/** Строка списка кампаний. */
export interface CampaignListItem {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  segmentName: string | null;
  sentCount: number;
  createdAt: string;
  sentAt: string | null;
}

/** Список кампаний организации. */
export async function listCampaigns(
  organizationId: string,
): Promise<CampaignListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];

  const segmentIds = rows
    .map((row) => row.segment_id)
    .filter((id): id is string => id !== null);
  const segmentNames = new Map<string, string>();
  if (segmentIds.length > 0) {
    const { data: segments } = await admin
      .from("contact_segments")
      .select("id, name")
      .in("id", segmentIds);
    for (const segment of segments ?? []) {
      segmentNames.set(segment.id, segment.name);
    }
  }

  const sentCounts = new Map<string, number>();
  const { data: reports } = await admin
    .from("campaign_reports")
    .select("campaign_id, sent_count")
    .eq("organization_id", organizationId);
  for (const report of reports ?? []) {
    sentCounts.set(report.campaign_id, report.sent_count);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subject: row.subject,
    status: row.status,
    segmentName: row.segment_id
      ? (segmentNames.get(row.segment_id) ?? null)
      : null,
    sentCount: sentCounts.get(row.id) ?? 0,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  }));
}

/** Полные данные кампании для конструктора. */
export interface CampaignEditorData {
  campaign: Campaign;
  blocks: CampaignBlockData[];
  segments: { id: string; name: string; count: number }[];
  report: CampaignReport | null;
  properties: PropertyEmailData[];
}

/** Кампания со связанными данными для страницы редактора. */
export async function getCampaignEditorData(
  organizationId: string,
  campaignId: string,
): Promise<CampaignEditorData | null> {
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!campaign) {
    return null;
  }

  const [blocksResult, segmentsResult, reportResult, properties] =
    await Promise.all([
      admin
        .from("campaign_blocks")
        .select("block_type, content")
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true }),
      admin
        .from("contact_segments")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      admin
        .from("campaign_reports")
        .select("*")
        .eq("campaign_id", campaignId)
        .maybeSingle(),
      getEmailPropertyData(admin, organizationId),
    ]);

  const blocks: CampaignBlockData[] = (blocksResult.data ?? [])
    .filter((row) => isBlockType(row.block_type))
    .map((row) => ({
      type: row.block_type as BlockType,
      content: (row.content ?? {}) as Record<string, unknown>,
    }));

  // Текущее (материализованное) число получателей по каждому сегменту —
  // для отображения в редакторе перед отправкой.
  const segments = await Promise.all(
    (segmentsResult.data ?? []).map(async (segment) => {
      const { count } = await admin
        .from("contact_segment_members")
        .select("*", { count: "exact", head: true })
        .eq("segment_id", segment.id);
      return { id: segment.id, name: segment.name, count: count ?? 0 };
    }),
  );

  return {
    campaign,
    blocks,
    segments,
    report: reportResult.data,
    properties,
  };
}

// ---- Сегменты -------------------------------------------------

/** Строка списка сегментов. */
export interface SegmentListItem {
  id: string;
  name: string;
  description: string | null;
  rule: string;
  value: string;
  isSystem: boolean;
  memberCount: number;
  lastRefreshedAt: string | null;
}

/** Список сегментов организации с числом контактов. */
export async function listSegments(
  organizationId: string,
): Promise<SegmentListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("contact_segments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });
  const rows = data ?? [];

  const counts = new Map<string, number>();
  if (rows.length > 0) {
    const { data: members } = await admin
      .from("contact_segment_members")
      .select("segment_id")
      .eq("organization_id", organizationId);
    for (const member of members ?? []) {
      counts.set(
        member.segment_id,
        (counts.get(member.segment_id) ?? 0) + 1,
      );
    }
  }

  return rows.map((row) => {
    const definition = parseDefinition(row.definition);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      rule: definition.rule,
      value: definition.value,
      isSystem: row.is_system,
      memberCount: counts.get(row.id) ?? 0,
      lastRefreshedAt: row.last_refreshed_at,
    };
  });
}

// ---- Marketing-контакты ---------------------------------------

/** Контакт в списке для маркетинга. */
export interface MarketingContactItem {
  id: string;
  fullName: string;
  email: string | null;
  language: string | null;
  subscribed: boolean;
}

/** Список контактов организации с признаком подписки на маркетинг. */
export async function listMarketingContacts(
  organizationId: string,
): Promise<MarketingContactItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("contacts")
    .select("id, full_name, email, preferred_language, consent_marketing")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = data ?? [];

  // Единый источник правды — колонка consent_marketing; плюс email-отписки.
  const unsubscribed = await loadUnsubscribedEmails(admin, organizationId);

  return rows.map((row) => {
    const emailLower = (row.email ?? "").toLowerCase();
    const subscribed =
      row.consent_marketing &&
      !(emailLower !== "" && unsubscribed.has(emailLower));
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      language: row.preferred_language,
      subscribed,
    };
  });
}
