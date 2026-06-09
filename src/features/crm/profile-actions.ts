"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

const CRM_CONTACTS = "/dashboard/crm/contacts";

type Result = { ok: true } | { ok: false; error: string };

/** Контакт должен принадлежать организации (защита upsert по contact_id). */
async function assertContactInOrg(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  contactId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data !== null;
}

const buyerProfileSchema = z.object({
  contactId: z.guid(),
  // Блок C — финансы/ипотека.
  paymentMethod: z.string().trim().max(20).nullable(),
  preapprovalStatus: z.string().trim().max(20).nullable(),
  preapprovalAmount: z.number().min(0).nullable(),
  lenderName: z.string().trim().max(200).nullable(),
  downPayment: z.number().min(0).nullable(),
  needsToSellFirst: z.boolean(),
  currentHousing: z.string().trim().max(20).nullable(),
  currency: z.string().trim().max(10).nullable(),
  // Блок D — параметры поиска объекта.
  dealType: z.string().trim().max(20).nullable(),
  propertyType: z.string().trim().max(30).nullable(),
  locations: z.array(z.string().trim().min(1).max(120)).max(30),
  bedsMin: z.number().int().min(0).max(50).nullable(),
  bathsMin: z.number().min(0).max(50).nullable(),
  areaMin: z.number().min(0).nullable(),
  areaMax: z.number().min(0).nullable(),
  budgetMin: z.number().min(0).nullable(),
  budgetMax: z.number().min(0).nullable(),
  mustHave: z.string().trim().max(2000).nullable(),
  searchNotes: z.string().trim().max(2000).nullable(),
});

/** Создаёт/обновляет финансовый профиль покупателя (1:1 с контактом). */
export async function upsertContactBuyerProfile(
  input: z.infer<typeof buyerProfileSchema>,
): Promise<Result> {
  const parsed = buyerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }
  const d = parsed.data;
  const supabase = createClient();
  if (!(await assertContactInOrg(supabase, context.organization.id, d.contactId))) {
    return { ok: false, error: "Contact not found." };
  }
  const { error } = await supabase.from("contact_buyer_profiles").upsert(
    {
      organization_id: context.organization.id,
      contact_id: d.contactId,
      payment_method: d.paymentMethod,
      preapproval_status: d.preapprovalStatus,
      preapproval_amount: d.preapprovalAmount,
      lender_name: d.lenderName,
      down_payment: d.downPayment,
      needs_to_sell_first: d.needsToSellFirst,
      current_housing: d.currentHousing,
      currency: d.currency,
      deal_type: d.dealType,
      property_type: d.propertyType,
      locations: [...new Set(d.locations.map((l) => l.trim()).filter(Boolean))],
      beds_min: d.bedsMin,
      baths_min: d.bathsMin,
      area_min: d.areaMin,
      area_max: d.areaMax,
      budget_min: d.budgetMin,
      budget_max: d.budgetMax,
      must_have: d.mustHave,
      search_notes: d.searchNotes,
    },
    { onConflict: "contact_id" },
  );
  if (error) {
    return { ok: false, error: "Could not save the buyer profile." };
  }
  revalidatePath(`${CRM_CONTACTS}/${d.contactId}`);
  return { ok: true };
}
