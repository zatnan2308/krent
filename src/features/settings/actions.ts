"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import {
  ORG_CONTEXT_TAG,
  requireOrganizationContext,
} from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---- Profile (auth.users.user_metadata + organization_members) ----

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  avatarUrl: z.string().trim().max(500).nullable(),
  bio: z.string().trim().max(2000).nullable(),
  phone: z.string().trim().max(60).nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the profile form." };
  }
  const context = await requireOrganizationContext();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(context.user.id, {
    user_metadata: {
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl,
      bio: parsed.data.bio,
      phone: parsed.data.phone,
    },
  });
  if (error) {
    return { ok: false, error: "Could not update profile." };
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// ---- Password ----------------------------------------------------

const passwordSchema = z.object({
  newPassword: z.string().min(8).max(200),
});
export type PasswordInput = z.infer<typeof passwordSchema>;

/** Меняет пароль текущего пользователя (email/password аккаунт). */
export async function changePassword(
  input: PasswordInput,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    return { ok: false, error: "Could not change the password." };
  }
  return { ok: true };
}

// ---- Branding ----------------------------------------------------

const brandingSchema = z.object({
  primaryColor: z.string().trim().max(20).nullable(),
  secondaryColor: z.string().trim().max(20).nullable(),
  accentColor: z.string().trim().max(20).nullable(),
  fontFamily: z.string().trim().max(200).nullable(),
  logoUrl: z.string().trim().max(500).nullable(),
  faviconUrl: z.string().trim().max(500).nullable(),
  customCss: z.string().trim().max(20000).nullable(),
});
export type BrandingInput = z.infer<typeof brandingSchema>;

export async function updateBranding(input: BrandingInput): Promise<ActionResult> {
  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the branding form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "branding.manage")) {
    return { ok: false, error: "You cannot change branding." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("brand_settings")
    .upsert(
      {
        organization_id: context.organization.id,
        primary_color: parsed.data.primaryColor,
        secondary_color: parsed.data.secondaryColor,
        accent_color: parsed.data.accentColor,
        font_family: parsed.data.fontFamily,
        logo_url: parsed.data.logoUrl,
        favicon_url: parsed.data.faviconUrl,
        custom_css: parsed.data.customCss,
      },
      { onConflict: "organization_id" },
    );
  if (error) return { ok: false, error: "Could not save branding." };
  revalidatePath("/dashboard/settings");
  revalidateTag("public-site");
  return { ok: true };
}

// ---- Site contact / socials / footer -----------------------------

const siteContactSchema = z.object({
  contactEmail: z.string().trim().max(200).nullable(),
  contactPhone: z.string().trim().max(60).nullable(),
  contactWhatsapp: z.string().trim().max(200).nullable(),
  contactMessenger: z.string().trim().max(200).nullable(),
  contactAddress: z.string().trim().max(300).nullable(),
  officeHours: z.string().trim().max(200).nullable(),
  responseTime: z.string().trim().max(120).nullable(),
  footerTagline: z.string().trim().max(500).nullable(),
  newsletterTitle: z.string().trim().max(200).nullable(),
  newsletterBlurb: z.string().trim().max(500).nullable(),
  socialInstagram: z.string().trim().max(300).nullable(),
  socialLinkedin: z.string().trim().max(300).nullable(),
  socialFacebook: z.string().trim().max(300).nullable(),
  socialX: z.string().trim().max(300).nullable(),
  socialYoutube: z.string().trim().max(300).nullable(),
  acqTransferPct: z.coerce.number().min(0).max(100),
  acqAgencyPct: z.coerce.number().min(0).max(100),
  acqRegistrationPct: z.coerce.number().min(0).max(100),
});
export type SiteContactInput = z.infer<typeof siteContactSchema>;

export async function updateSiteContact(
  input: SiteContactInput,
): Promise<ActionResult> {
  const parsed = siteContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the contact form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "branding.manage")) {
    return { ok: false, error: "You cannot change site settings." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("brand_settings").upsert(
    {
      organization_id: context.organization.id,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone,
      contact_whatsapp: parsed.data.contactWhatsapp,
      contact_messenger: parsed.data.contactMessenger,
      contact_address: parsed.data.contactAddress,
      office_hours: parsed.data.officeHours,
      response_time: parsed.data.responseTime,
      footer_tagline: parsed.data.footerTagline,
      newsletter_title: parsed.data.newsletterTitle,
      newsletter_blurb: parsed.data.newsletterBlurb,
      social_instagram: parsed.data.socialInstagram,
      social_linkedin: parsed.data.socialLinkedin,
      social_facebook: parsed.data.socialFacebook,
      social_x: parsed.data.socialX,
      social_youtube: parsed.data.socialYoutube,
      acq_transfer_pct: parsed.data.acqTransferPct,
      acq_agency_pct: parsed.data.acqAgencyPct,
      acq_registration_pct: parsed.data.acqRegistrationPct,
    },
    { onConflict: "organization_id" },
  );
  if (error) return { ok: false, error: "Could not save site contact." };
  revalidatePath("/dashboard/settings");
  revalidateTag("public-site");
  return { ok: true };
}

// ---- Localization ------------------------------------------------

const localizationSchema = z.object({
  organizationName: z.string().trim().min(1).max(120),
  defaultLanguage: z.string().trim().min(2).max(10),
  defaultCurrency: z.string().trim().min(3).max(10),
  enabledLanguages: z.array(z.string().trim().min(2).max(10)).min(1),
  enabledCurrencies: z.array(z.string().trim().min(3).max(10)).min(1),
  timezone: z.string().trim().min(3).max(60),
  measurementSystem: z.enum(["metric", "imperial"]),
});
export type LocalizationInput = z.infer<typeof localizationSchema>;

export async function updateLocalization(
  input: LocalizationInput,
): Promise<ActionResult> {
  const parsed = localizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the localization form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "organization.update")) {
    return { ok: false, error: "You cannot change organization settings." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      name: parsed.data.organizationName,
      default_language: parsed.data.defaultLanguage,
      default_currency: parsed.data.defaultCurrency,
      enabled_languages: parsed.data.enabledLanguages,
      enabled_currencies: parsed.data.enabledCurrencies,
      timezone: parsed.data.timezone,
      measurement_system: parsed.data.measurementSystem,
    })
    .eq("id", context.organization.id);
  if (error) return { ok: false, error: "Could not save localization." };
  revalidatePath("/dashboard/settings");
  revalidateTag(ORG_CONTEXT_TAG);
  // Имя организации = публичное имя сайта (header/footer/SEO).
  revalidateTag("public-site");
  return { ok: true };
}

// ---- Modules toggle ---------------------------------------------

const moduleToggleSchema = z.object({
  moduleId: z.uuid(),
  enabled: z.boolean(),
});
export type ModuleToggleInput = z.infer<typeof moduleToggleSchema>;

export async function toggleModule(
  input: ModuleToggleInput,
): Promise<ActionResult> {
  const parsed = moduleToggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "modules.manage")) {
    return { ok: false, error: "You cannot manage modules." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("organization_modules")
    .upsert({
      organization_id: context.organization.id,
      module_id: parsed.data.moduleId,
      enabled: parsed.data.enabled,
    });
  if (error) return { ok: false, error: "Could not toggle module." };
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "module.toggled",
    entityType: "module",
    entityId: parsed.data.moduleId,
    metadata: { enabled: parsed.data.enabled },
  });
  revalidatePath("/dashboard/settings");
  revalidateTag(ORG_CONTEXT_TAG);
  return { ok: true };
}

// ---- Team / Members ---------------------------------------------

const inviteMemberSchema = z.object({
  email: z.email(),
  roleId: z.uuid(),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export async function inviteMember(
  input: InviteMemberInput,
): Promise<ActionResult> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "members.invite")) {
    return { ok: false, error: "You cannot invite members." };
  }
  const admin = createAdminClient();

  // Создаём или находим пользователя по email.
  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  let userId = list?.users.find(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
  )?.id;
  if (!userId) {
    const { data: invite, error: createError } =
      await admin.auth.admin.inviteUserByEmail(parsed.data.email);
    if (createError || !invite?.user) {
      return { ok: false, error: "Could not invite this email." };
    }
    userId = invite.user.id;
  }

  const { error } = await admin
    .from("organization_members")
    .upsert({
      organization_id: context.organization.id,
      user_id: userId,
      role_id: parsed.data.roleId,
      status: "active",
      invited_by: context.user.id,
    });
  if (error) return { ok: false, error: "Could not add member." };
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "member.invited",
    entityType: "member",
    entityId: userId,
    metadata: { email: parsed.data.email, roleId: parsed.data.roleId },
  });
  revalidatePath("/dashboard/settings");
  revalidateTag(ORG_CONTEXT_TAG);
  return { ok: true };
}

const removeMemberSchema = z.object({ userId: z.uuid() });
export async function removeMember(
  input: z.infer<typeof removeMemberSchema>,
): Promise<ActionResult> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "members.manage")) {
    return { ok: false, error: "You cannot manage members." };
  }
  if (parsed.data.userId === context.user.id) {
    return { ok: false, error: "You cannot remove yourself." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", context.organization.id)
    .eq("user_id", parsed.data.userId);
  if (error) return { ok: false, error: "Could not remove member." };
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "member.removed",
    entityType: "member",
    entityId: parsed.data.userId,
  });
  revalidatePath("/dashboard/settings");
  revalidateTag(ORG_CONTEXT_TAG);
  return { ok: true };
}

const changeRoleSchema = z.object({
  userId: z.uuid(),
  roleId: z.uuid(),
});
export async function changeMemberRole(
  input: z.infer<typeof changeRoleSchema>,
): Promise<ActionResult> {
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "roles.manage")) {
    return { ok: false, error: "You cannot change roles." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("organization_members")
    .update({ role_id: parsed.data.roleId })
    .eq("organization_id", context.organization.id)
    .eq("user_id", parsed.data.userId);
  if (error) return { ok: false, error: "Could not change role." };
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "member.role_changed",
    entityType: "member",
    entityId: parsed.data.userId,
    metadata: { roleId: parsed.data.roleId },
  });
  revalidatePath("/dashboard/settings");
  revalidateTag(ORG_CONTEXT_TAG);
  return { ok: true };
}
