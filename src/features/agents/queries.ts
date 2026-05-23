import { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

interface AgentInfo {
  name: string;
  photoUrl: string | null;
}

/** Резолвит имя и фото агента из auth.users (user_metadata). */
async function resolveAgent(
  admin: Admin,
  userId: string,
): Promise<AgentInfo | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    const user = data.user;
    if (!user) {
      return null;
    }
    const meta = user.user_metadata ?? {};
    const name =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      (user.email ? (user.email.split("@")[0] ?? "") : "") ||
      "Agent";
    const photoUrl =
      typeof meta.avatar_url === "string" && meta.avatar_url.trim() !== ""
        ? meta.avatar_url
        : null;
    return { name, photoUrl };
  } catch {
    return null;
  }
}

/** Карточка агента в списке. */
export interface AgentSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  listingCount: number;
}

/** Карта обложек объектов по их id. */
async function loadCovers(
  admin: Admin,
  propertyIds: string[],
): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  if (propertyIds.length === 0) {
    return covers;
  }
  const { data: media } = await admin
    .from("property_media")
    .select("property_id, url, category, sort_order")
    .in("property_id", propertyIds)
    .order("sort_order", { ascending: true });
  for (const item of media ?? []) {
    const current = covers.get(item.property_id);
    if (!current || item.category === "cover") {
      covers.set(item.property_id, item.url);
    }
  }
  return covers;
}

/** Агенты организации, у которых есть активные публичные объекты. */
export async function listPublicAgents(
  organizationId: string,
): Promise<AgentSummary[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("properties")
    .select("assigned_agent_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("visibility", "public");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.assigned_agent_id) {
      counts.set(
        row.assigned_agent_id,
        (counts.get(row.assigned_agent_id) ?? 0) + 1,
      );
    }
  }

  const agents: AgentSummary[] = [];
  for (const [id, listingCount] of counts.entries()) {
    const info = await resolveAgent(admin, id);
    if (info) {
      agents.push({
        id,
        name: info.name,
        photoUrl: info.photoUrl,
        listingCount,
      });
    }
  }
  agents.sort((left, right) => right.listingCount - left.listingCount);
  return agents;
}

/** Профиль агента. */
export interface AgentProfile {
  id: string;
  name: string;
  photoUrl: string | null;
  listings: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
  }[];
}

/** Профиль агента организации с его активными публичными объектами. */
export async function getPublicAgent(
  organizationId: string,
  agentId: string,
): Promise<AgentProfile | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("properties")
    .select("id, title, slug")
    .eq("organization_id", organizationId)
    .eq("assigned_agent_id", agentId)
    .eq("status", "active")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  // Публичный профиль имеет смысл только при наличии объектов.
  if (rows.length === 0) {
    return null;
  }

  const info = await resolveAgent(admin, agentId);
  if (!info) {
    return null;
  }

  const covers = await loadCovers(
    admin,
    rows.map((row) => row.id),
  );

  return {
    id: agentId,
    name: info.name,
    photoUrl: info.photoUrl,
    listings: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      coverImageUrl: covers.get(row.id) ?? null,
    })),
  };
}
