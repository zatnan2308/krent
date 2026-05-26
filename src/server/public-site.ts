import { headers } from "next/headers";
import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/**
 * Контекст публичного сайта организации.
 *
 * Организация резолвится по домену запроса (таблица domains). Резолв и
 * чтение бренда/SEO идут через сервисный клиент — это привилегированная
 * инфраструктурная операция определения арендатора. Контент страниц
 * читается отдельно через anon-клиент с RLS (виден только published).
 */
export interface PublicSiteContext {
  organization: Tables<"organizations">;
  brand: Tables<"brand_settings"> | null;
  seo: Tables<"seo_settings"> | null;
}

function getRequestHost(): string {
  const host = headers().get("host") ?? "";
  return host.split(":")[0]?.toLowerCase() ?? "";
}

/** Резолв организации по host — закэширован per-host на 5 минут. */
const resolveOrganizationByHostCached = unstable_cache(
  async (host: string): Promise<Tables<"organizations"> | null> => {
    const admin = createAdminClient();
    if (host) {
      const { data: domain } = await admin
        .from("domains")
        .select("organization_id")
        .eq("domain", host)
        .eq("status", "verified")
        .maybeSingle();

      if (domain) {
        const { data: organization } = await admin
          .from("organizations")
          .select("*")
          .eq("id", domain.organization_id)
          .maybeSingle();
        if (organization) return organization;
      }
    }
    const { data: fallback } = await admin
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return fallback;
  },
  ["public-organization-by-host"],
  { revalidate: 300, tags: ["public-site"] },
);

/**
 * Резолвит организацию публичного сайта по домену запроса.
 * Fallback (домен не настроен, локальная разработка) — первая организация.
 */
export async function resolvePublicOrganization(): Promise<
  Tables<"organizations"> | null
> {
  return resolveOrganizationByHostCached(getRequestHost());
}

/** Контекст бренда и SEO по orgId — закэширован per-org на 60 секунд. */
const getBrandAndSeoCached = unstable_cache(
  async (organizationId: string) => {
    const admin = createAdminClient();
    const [brandResult, seoResult] = await Promise.all([
      admin
        .from("brand_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      admin
        .from("seo_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);
    return { brand: brandResult.data, seo: seoResult.data };
  },
  ["public-brand-seo-by-org"],
  { revalidate: 60, tags: ["public-site"] },
);

/** Собирает контекст публичного сайта: организация, бренд, SEO-настройки. */
export async function getPublicSiteContext(): Promise<PublicSiteContext | null> {
  const organization = await resolvePublicOrganization();
  if (!organization) {
    return null;
  }
  const { brand, seo } = await getBrandAndSeoCached(organization.id);
  return { organization, brand, seo };
}
