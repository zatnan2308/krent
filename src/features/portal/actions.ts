"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import {
  invitePortalSchema,
  type ActionResult,
  type InvitePortalInput,
} from "./schema";

const CLIENTS_PATH = "/dashboard/clients";
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Генерирует токен приглашения. */
function generateToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

/** Приглашает контакт в клиентский портал. */
export async function inviteToPortal(
  input: InvitePortalInput,
): Promise<ActionResult> {
  const parsed = invitePortalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid invitation data." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to invite clients." };
  }

  const data = parsed.data;
  const supabase = createClient();
  const organizationId = context.organization.id;

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("organization_id", organizationId)
    .eq("id", data.contactId)
    .maybeSingle();
  if (!contact) {
    return { ok: false, error: "Contact not found." };
  }
  if (!contact.email) {
    return {
      ok: false,
      error: "Add an email address to the contact before inviting them.",
    };
  }

  const { error } = await supabase.from("portal_accounts").insert({
    organization_id: organizationId,
    contact_id: contact.id,
    portal_type: data.portalType,
    email: contact.email,
    invite_token: generateToken(),
    status: "pending",
    invited_by: context.user.id,
    expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "This contact already has a portal account of this type.",
      };
    }
    return { ok: false, error: "Could not create the invitation." };
  }

  // Портал продавца: привязываем контакт к выбранному объекту.
  if (data.portalType === "seller" && data.propertyId) {
    const admin = createAdminClient();
    await admin
      .from("properties")
      .update({ seller_contact_id: contact.id })
      .eq("id", data.propertyId)
      .eq("organization_id", organizationId);
  }

  revalidatePath(CLIENTS_PATH);
  return { ok: true };
}

/** Отзывает доступ клиента к порталу. */
export async function revokePortalAccount(
  accountId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return {
      ok: false,
      error: "You do not have permission to manage client access.",
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("portal_accounts")
    .update({ status: "revoked" })
    .eq("id", accountId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not revoke access." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Portal account not found." };
  }

  revalidatePath(CLIENTS_PATH);
  return { ok: true };
}

/**
 * Принимает приглашение по токену: связывает портальный аккаунт с текущим
 * пользователем. При успехе делает редирект в соответствующий портал.
 */
export async function acceptPortalInvite(
  token: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Please sign in to accept the invitation." };
  }
  if (!token) {
    return { ok: false, error: "Invalid invitation link." };
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("portal_accounts")
    .select("*")
    .eq("invite_token", token)
    .maybeSingle();
  if (!account) {
    return { ok: false, error: "Invitation not found." };
  }
  if (account.status === "active" && account.user_id === user.id) {
    redirect(`/portal/${account.portal_type}`);
  }
  if (account.status !== "pending") {
    return { ok: false, error: "This invitation is no longer valid." };
  }
  if (
    account.expires_at &&
    new Date(account.expires_at).getTime() < Date.now()
  ) {
    return { ok: false, error: "This invitation has expired." };
  }
  if (
    !user.email ||
    user.email.toLowerCase() !== account.email.toLowerCase()
  ) {
    return {
      ok: false,
      error: `This invitation was sent to ${account.email}. Sign in with that email to accept it.`,
    };
  }

  const { error } = await admin
    .from("portal_accounts")
    .update({
      user_id: user.id,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", account.id);
  if (error) {
    return { ok: false, error: "Could not accept the invitation." };
  }

  redirect(`/portal/${account.portal_type}`);
}

/** Проверяет, владеет ли пользователь активным порталом для контакта. */
async function ownsPortalContact(
  userId: string,
  contactId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("portal_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data !== null;
}

/** Удаляет объект из избранного покупателя. */
export async function removeFavoriteProperty(
  favoriteId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const admin = createAdminClient();
  const { data: favorite } = await admin
    .from("favorite_properties")
    .select("id, contact_id")
    .eq("id", favoriteId)
    .maybeSingle();
  if (!favorite || !favorite.contact_id) {
    return { ok: false, error: "Item not found." };
  }
  if (!(await ownsPortalContact(user.id, favorite.contact_id))) {
    return { ok: false, error: "You cannot modify this item." };
  }

  const { error } = await admin
    .from("favorite_properties")
    .delete()
    .eq("id", favoriteId);
  if (error) {
    return { ok: false, error: "Could not remove the property." };
  }

  revalidatePath("/portal/buyer");
  return { ok: true };
}

/** Удаляет сохранённый поиск покупателя. */
export async function removeSavedSearch(
  savedSearchId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const admin = createAdminClient();
  const { data: search } = await admin
    .from("saved_searches")
    .select("id, contact_id")
    .eq("id", savedSearchId)
    .maybeSingle();
  if (!search || !search.contact_id) {
    return { ok: false, error: "Item not found." };
  }
  if (!(await ownsPortalContact(user.id, search.contact_id))) {
    return { ok: false, error: "You cannot modify this item." };
  }

  const { error } = await admin
    .from("saved_searches")
    .delete()
    .eq("id", savedSearchId);
  if (error) {
    return { ok: false, error: "Could not remove the search." };
  }

  revalidatePath("/portal/buyer");
  return { ok: true };
}
