import { createAdminClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/** Правило сегмента из contact_segments.definition. */
export interface SegmentDefinition {
  rule: string;
  value: string;
}

/** Системные сегменты, создаваемые автоматически для организации. */
const SYSTEM_SEGMENTS: { name: string; definition: SegmentDefinition }[] = [
  { name: "All buyers", definition: { rule: "lead_type", value: "buyer" } },
  { name: "All sellers", definition: { rule: "lead_type", value: "seller" } },
  { name: "All guests", definition: { rule: "lead_type", value: "guest" } },
  {
    name: "Google Ads leads",
    definition: { rule: "channel", value: "google_ads" },
  },
  {
    name: "Meta Ads leads",
    definition: { rule: "channel", value: "meta_ads" },
  },
  {
    name: "Organic / SEO leads",
    definition: { rule: "channel", value: "organic" },
  },
];

/** Читает определение сегмента из jsonb. */
export function parseDefinition(definition: unknown): SegmentDefinition {
  if (definition && typeof definition === "object") {
    const data = definition as Record<string, unknown>;
    return {
      rule: typeof data.rule === "string" ? data.rule : "all",
      value: typeof data.value === "string" ? data.value : "",
    };
  }
  return { rule: "all", value: "" };
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

/** Сопоставляет строку атрибуции лида каналу привлечения. */
function matchChannel(
  row: { utm_source: string | null; gclid: string | null; fbclid: string | null },
  channel: string,
): boolean {
  const source = (row.utm_source ?? "").toLowerCase();
  if (channel === "google_ads") {
    return (
      row.gclid !== null ||
      source.includes("google") ||
      source === "cpc" ||
      source === "ppc"
    );
  }
  if (channel === "meta_ads") {
    return (
      row.fbclid !== null ||
      source.includes("facebook") ||
      source.includes("meta") ||
      source.includes("instagram") ||
      source === "ig" ||
      source === "fb"
    );
  }
  if (channel === "organic") {
    return row.gclid === null && row.fbclid === null && source === "";
  }
  return false;
}

/**
 * Резолвит динамический сегмент в список contact_id. Правила:
 * all, lead_type, channel, language, currency, city, property_type.
 */
export async function resolveSegmentContactIds(
  admin: Admin,
  organizationId: string,
  definition: unknown,
): Promise<string[]> {
  const def = parseDefinition(definition);

  if (def.rule === "language" || def.rule === "currency" || def.rule === "all") {
    let query = admin
      .from("contacts")
      .select("id")
      .eq("organization_id", organizationId);
    if (def.rule === "language") {
      query = query.eq("preferred_language", def.value);
    } else if (def.rule === "currency") {
      query = query.eq("preferred_currency", def.value);
    }
    const { data } = await query;
    return unique((data ?? []).map((row) => row.id));
  }

  if (def.rule === "lead_type") {
    const { data } = await admin
      .from("leads")
      .select("contact_id")
      .eq("organization_id", organizationId)
      .eq("type", def.value as Enums<"lead_type">);
    return unique((data ?? []).map((row) => row.contact_id));
  }

  // Прямые поля контакта (роль/стадия жизненного цикла/тег).
  if (def.rule === "role" || def.rule === "lifecycle") {
    const column = def.rule === "role" ? "role" : "lifecycle_stage";
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq(column, def.value);
    return unique((data ?? []).map((row) => row.id));
  }

  if (def.rule === "tag") {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .contains("tags", [def.value]);
    return unique((data ?? []).map((row) => row.id));
  }

  if (def.rule === "city") {
    const { data } = await admin
      .from("leads")
      .select("contact_id")
      .eq("organization_id", organizationId)
      .ilike("location_interest", `%${def.value}%`);
    return unique((data ?? []).map((row) => row.contact_id));
  }

  if (def.rule === "property_type") {
    const { data: properties } = await admin
      .from("properties")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("property_type", def.value as Enums<"property_type">);
    const propertyIds = (properties ?? []).map((row) => row.id);
    if (propertyIds.length === 0) {
      return [];
    }
    const { data: leads } = await admin
      .from("leads")
      .select("contact_id")
      .eq("organization_id", organizationId)
      .in("property_id", propertyIds);
    return unique((leads ?? []).map((row) => row.contact_id));
  }

  if (def.rule === "channel") {
    const { data: attribution } = await admin
      .from("lead_attribution")
      .select("lead_id, utm_source, gclid, fbclid")
      .eq("organization_id", organizationId);
    const leadIds = (attribution ?? [])
      .filter((row) => matchChannel(row, def.value))
      .map((row) => row.lead_id);
    if (leadIds.length === 0) {
      return [];
    }
    const { data: leads } = await admin
      .from("leads")
      .select("contact_id")
      .in("id", leadIds);
    return unique((leads ?? []).map((row) => row.contact_id));
  }

  return [];
}

/** Пересобирает материализованный состав сегмента. */
export async function materializeSegment(
  admin: Admin,
  segment: { id: string; organization_id: string; definition: unknown },
): Promise<number> {
  const contactIds = await resolveSegmentContactIds(
    admin,
    segment.organization_id,
    segment.definition,
  );
  await admin
    .from("contact_segment_members")
    .delete()
    .eq("segment_id", segment.id);
  if (contactIds.length > 0) {
    await admin.from("contact_segment_members").insert(
      contactIds.map((contactId) => ({
        organization_id: segment.organization_id,
        segment_id: segment.id,
        contact_id: contactId,
      })),
    );
  }
  await admin
    .from("contact_segments")
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq("id", segment.id);
  return contactIds.length;
}

/** Создаёт недостающие системные сегменты организации и наполняет их. */
export async function provisionSystemSegments(
  organizationId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("contact_segments")
    .select("name")
    .eq("organization_id", organizationId)
    .eq("is_system", true);
  const existingNames = new Set((existing ?? []).map((row) => row.name));

  for (const segment of SYSTEM_SEGMENTS) {
    if (existingNames.has(segment.name)) {
      continue;
    }
    const { data: created } = await admin
      .from("contact_segments")
      .insert({
        organization_id: organizationId,
        name: segment.name,
        definition: {
          rule: segment.definition.rule,
          value: segment.definition.value,
        },
        is_system: true,
      })
      .select("id, organization_id, definition")
      .single();
    if (created) {
      await materializeSegment(admin, created);
    }
  }
}

/** Пересобирает состав одного сегмента организации. */
export async function refreshSegmentMembers(
  organizationId: string,
  segmentId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: segment } = await admin
    .from("contact_segments")
    .select("id, organization_id, definition")
    .eq("id", segmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!segment) {
    return false;
  }
  await materializeSegment(admin, segment);
  return true;
}
