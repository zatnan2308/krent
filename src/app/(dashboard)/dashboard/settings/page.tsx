import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsTabs } from "@/features/settings/settings-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "organization.view")) {
    redirect(ROUTES.dashboard.root);
  }
  const orgId = context.organization.id;
  const admin = createAdminClient();

  const [brand, modulesAll, orgModules, members, roles, domainsData] =
    await Promise.all([
    admin
      .from("brand_settings")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle(),
    admin.from("modules").select("id, key, name").order("name"),
    admin
      .from("organization_modules")
      .select("module_id, enabled")
      .eq("organization_id", orgId),
    admin
      .from("organization_members")
      .select("user_id, role_id, status")
      .eq("organization_id", orgId),
    admin.from("roles").select("id, key, name").order("name"),
    admin
      .from("domains")
      .select("id, domain, status, type")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
  ]);

  // Email пользователей через auth admin — параллельно (а не N последовательных).
  const memberRows = members.data ?? [];
  const memberEmails = new Map<string, string>();
  await Promise.all(
    memberRows.map(async (m) => {
      try {
        const { data } = await admin.auth.admin.getUserById(m.user_id);
        if (data.user?.email) memberEmails.set(m.user_id, data.user.email);
      } catch {
        // ignore
      }
    }),
  );

  const enabledById = new Map(
    (orgModules.data ?? []).map((row) => [row.module_id, row.enabled]),
  );
  const modulesData = (modulesAll.data ?? []).map((m) => ({
    id: m.id,
    key: m.key,
    name: m.name,
    enabled: enabledById.get(m.id) ?? false,
  }));

  const { data: agentProfileRow } = await admin
    .from("agent_profiles")
    .select("title, bio, phone, rera_number, specialization, photo_url")
    .eq("organization_id", orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  const agentProfile = {
    title: agentProfileRow?.title ?? null,
    bio: agentProfileRow?.bio ?? null,
    phone: agentProfileRow?.phone ?? null,
    reraNumber: agentProfileRow?.rera_number ?? null,
    specialization: agentProfileRow?.specialization ?? null,
    photoUrl: agentProfileRow?.photo_url ?? null,
  };

  const meta = (context.user.user_metadata ?? {}) as Record<string, unknown>;
  const profile = {
    fullName: typeof meta.full_name === "string" ? meta.full_name : "",
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : "",
    bio: typeof meta.bio === "string" ? meta.bio : "",
    phone: typeof meta.phone === "string" ? meta.phone : "",
  };

  const dict = await getServerDictionary();

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.settings}
        description={dict.settingsForm.pageDesc.replace(
          "{name}",
          context.organization.name,
        )}
      />

      <SettingsTabs
        profile={profile}
        agentProfile={agentProfile}
        branding={{
          primaryColor: brand.data?.primary_color ?? null,
          secondaryColor: brand.data?.secondary_color ?? null,
          accentColor: brand.data?.accent_color ?? null,
          fontFamily: brand.data?.font_family ?? null,
          logoUrl: brand.data?.logo_url ?? null,
          faviconUrl: brand.data?.favicon_url ?? null,
          customCss: brand.data?.custom_css ?? null,
        }}
        siteContact={{
          contactEmail: brand.data?.contact_email ?? null,
          contactPhone: brand.data?.contact_phone ?? null,
          contactWhatsapp: brand.data?.contact_whatsapp ?? null,
          contactMessenger: brand.data?.contact_messenger ?? null,
          contactAddress: brand.data?.contact_address ?? null,
          officeHours: brand.data?.office_hours ?? null,
          responseTime: brand.data?.response_time ?? null,
          headerTagline: brand.data?.header_tagline ?? null,
          footerTagline: brand.data?.footer_tagline ?? null,
          newsletterTitle: brand.data?.newsletter_title ?? null,
          newsletterBlurb: brand.data?.newsletter_blurb ?? null,
          socialInstagram: brand.data?.social_instagram ?? null,
          socialLinkedin: brand.data?.social_linkedin ?? null,
          socialFacebook: brand.data?.social_facebook ?? null,
          socialX: brand.data?.social_x ?? null,
          socialYoutube: brand.data?.social_youtube ?? null,
          acqTransferPct: brand.data?.acq_transfer_pct ?? 4,
          acqAgencyPct: brand.data?.acq_agency_pct ?? 2,
          acqRegistrationPct: brand.data?.acq_registration_pct ?? 0.25,
        }}
        localization={{
          organizationName: context.organization.name,
          defaultLanguage: context.organization.default_language,
          defaultCurrency: context.organization.default_currency,
          enabledLanguages: context.organization.enabled_languages,
          enabledCurrencies: context.organization.enabled_currencies,
          timezone: context.organization.timezone,
          measurementSystem: context.organization.measurement_system,
        }}
        modules={modulesData}
        members={memberRows.map((m) => ({
          userId: m.user_id,
          email: memberEmails.get(m.user_id) ?? m.user_id,
          roleId: m.role_id,
          status: m.status,
        }))}
        roles={(roles.data ?? []).map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
        }))}
        currentUserId={context.user.id}
        domains={(domainsData.data ?? []).map((d) => ({
          id: d.id,
          domain: d.domain,
          status: d.status,
          type: d.type,
        }))}
        canManageDomains={hasPermission(context, "domains.manage")}
      />
    </div>
  );
}
