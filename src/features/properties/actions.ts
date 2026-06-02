"use server";

import { revalidatePath } from "next/cache";

import { dispatchWebhookEvent } from "@/features/agency-api/webhooks";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { canEditProperty } from "./access";
import {
  createPropertySchema,
  updatePropertySchema,
  type ActionResult,
  type CreatePropertyInput,
  type SaveResult,
  type UpdatePropertyInput,
} from "./schema";

const PROPERTIES_PATH = "/dashboard/properties";

/**
 * Преобразует текст в slug. Обрабатывает только латиницу и цифры;
 * для остальных алфавитов вернёт пустую строку — вызывающий код
 * подставляет запасной slug.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Короткий случайный суффикс — гарантирует уникальность slug при создании. */
function randomSlugSuffix(): string {
  return `${Math.random().toString(36).slice(2)}000000`.slice(0, 6);
}

/** Создаёт объект с минимальными данными и переводом на язык по умолчанию. */
export async function createProperty(
  input: CreatePropertyInput,
): Promise<SaveResult> {
  const parsed = createPropertySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid property data." };
  }

  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.create")) {
    return {
      ok: false,
      error: "You do not have permission to create properties.",
    };
  }

  const data = parsed.data;
  const supabase = createClient();
  const organizationId = context.organization.id;
  const slug = `${slugify(data.title) || "property"}-${randomSlugSuffix()}`;

  const { data: created, error } = await supabase
    .from("properties")
    .insert({
      organization_id: organizationId,
      assigned_agent_id: context.user.id,
      title: data.title,
      slug,
      property_type: data.propertyType,
      purpose: data.purpose,
      status: "draft",
      visibility: "private",
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: "Could not create the property." };
  }

  // Перевод на язык по умолчанию: заголовок дублируется как стартовая точка.
  await supabase.from("property_translations").insert({
    property_id: created.id,
    organization_id: organizationId,
    locale: context.organization.default_language,
    title: data.title,
  });

  await dispatchWebhookEvent({
    organizationId,
    eventType: "property.created",
    entityType: "property",
    entityId: created.id,
    payload: { property_id: created.id, title: data.title, slug },
  });

  revalidatePath(PROPERTIES_PATH);
  return { ok: true, id: created.id };
}

/** Сохраняет все данные объекта из формы редактирования. */
export async function updateProperty(
  input: UpdatePropertyInput,
): Promise<ActionResult> {
  const parsed = updatePropertySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid property data." };
  }

  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.update")) {
    return {
      ok: false,
      error: "You do not have permission to update properties.",
    };
  }

  const data = parsed.data;
  const supabase = createClient();
  const organizationId = context.organization.id;

  // Объект должен принадлежать организации и быть доступен пользователю.
  const { data: existing } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids, status, visibility")
    .eq("organization_id", organizationId)
    .eq("id", data.id)
    .maybeSingle();
  if (!existing) {
    return { ok: false, error: "Property not found." };
  }
  if (!canEditProperty(context, existing)) {
    return { ok: false, error: "You cannot edit this property." };
  }

  // Снимок прошлой цены — нужен для определения price_changed события.
  const { data: previousPrice } = await supabase
    .from("property_prices")
    .select("amount, currency")
    .eq("property_id", data.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // ---- properties --------------------------------------------
  const { error: propertyError } = await supabase
    .from("properties")
    .update({
      title: data.title,
      slug: data.slug,
      property_type: data.propertyType,
      purpose: data.purpose,
      status: data.status,
      visibility: data.visibility,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      beds: data.beds,
      guest_capacity: data.guestCapacity,
      size: data.size,
      size_unit: data.sizeUnit,
      lot_size: data.lotSize,
      floor: data.floor,
      total_floors: data.totalFloors,
      year_built: data.yearBuilt,
      parking: data.parking,
      garage: data.garage,
      listing_view: data.listingView,
      furnishing: data.furnishing,
      completion: data.completion,
      ownership: data.ownership,
      rental_yield: data.rentalYield,
      lifestyle_tags: data.lifestyleTags,
      badge: data.badge,
    })
    .eq("id", data.id)
    .eq("organization_id", organizationId);
  if (propertyError) {
    if (propertyError.code === "23505") {
      return {
        ok: false,
        error: "This slug is already used by another property.",
      };
    }
    return { ok: false, error: "Could not save the property." };
  }

  // ---- property_translations (язык по умолчанию) -------------
  const { error: translationError } = await supabase
    .from("property_translations")
    .upsert({
      property_id: data.id,
      organization_id: organizationId,
      locale: context.organization.default_language,
      title: data.title,
      description: data.description,
      seo_title: data.seoTitle,
      seo_description: data.seoDescription,
    });
  if (translationError) {
    return { ok: false, error: "Could not save property content." };
  }

  // ---- property_prices (одна цена на объект) -----------------
  const { data: existingPrice } = await supabase
    .from("property_prices")
    .select("id")
    .eq("property_id", data.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data.price) {
    const priceRow = {
      amount: data.price.amount,
      currency: data.price.currency,
      price_period: data.price.pricePeriod,
      display_type: data.price.displayType,
      old_amount: data.price.oldAmount,
      security_deposit: data.price.securityDeposit,
      cleaning_fee: data.price.cleaningFee,
      taxes: data.price.taxes,
    };
    const { error: priceError } = existingPrice
      ? await supabase
          .from("property_prices")
          .update(priceRow)
          .eq("id", existingPrice.id)
      : await supabase.from("property_prices").insert({
          property_id: data.id,
          organization_id: organizationId,
          ...priceRow,
        });
    if (priceError) {
      return { ok: false, error: "Could not save the price." };
    }
  } else if (existingPrice) {
    await supabase.from("property_prices").delete().eq("id", existingPrice.id);
  }

  // ---- property_locations (1:1) ------------------------------
  const { error: locationError } = await supabase
    .from("property_locations")
    .upsert({
      property_id: data.id,
      organization_id: organizationId,
      country: data.location.country,
      city: data.location.city,
      area: data.location.area,
      address: data.location.address,
      public_address: data.location.publicAddress,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      exact_address_visibility: data.location.exactAddressVisibility,
    });
  if (locationError) {
    return { ok: false, error: "Could not save the location." };
  }

  // ---- property_amenities (полная замена набора) -------------
  await supabase.from("property_amenities").delete().eq("property_id", data.id);
  if (data.amenityIds.length > 0) {
    const { error: amenityError } = await supabase
      .from("property_amenities")
      .insert(
        data.amenityIds.map((amenityId) => ({
          property_id: data.id,
          organization_id: organizationId,
          amenity_id: amenityId,
        })),
      );
    if (amenityError) {
      return { ok: false, error: "Could not save the amenities." };
    }
  }

  // ---- webhook события на изменения ---------------------------
  await dispatchWebhookEvent({
    organizationId,
    eventType: "property.updated",
    entityType: "property",
    entityId: data.id,
    payload: { property_id: data.id, slug: data.slug },
  });
  if (existing.status !== data.status) {
    await dispatchWebhookEvent({
      organizationId,
      eventType: "property.status_changed",
      entityType: "property",
      entityId: data.id,
      payload: {
        property_id: data.id,
        from: existing.status,
        to: data.status,
      },
    });
  }
  if (existing.visibility !== data.visibility) {
    if (data.visibility === "public" && existing.visibility !== "public") {
      await dispatchWebhookEvent({
        organizationId,
        eventType: "property.published",
        entityType: "property",
        entityId: data.id,
        payload: { property_id: data.id },
      });
    } else if (
      existing.visibility === "public" &&
      data.visibility !== "public"
    ) {
      await dispatchWebhookEvent({
        organizationId,
        eventType: "property.unpublished",
        entityType: "property",
        entityId: data.id,
        payload: { property_id: data.id },
      });
    }
  }
  if (
    data.price &&
    (!previousPrice ||
      previousPrice.amount !== data.price.amount ||
      previousPrice.currency !== data.price.currency)
  ) {
    await dispatchWebhookEvent({
      organizationId,
      eventType: "property.price_changed",
      entityType: "property",
      entityId: data.id,
      payload: {
        property_id: data.id,
        previous: previousPrice
          ? { amount: previousPrice.amount, currency: previousPrice.currency }
          : null,
        next: { amount: data.price.amount, currency: data.price.currency },
      },
    });
  }

  revalidatePath(PROPERTIES_PATH);
  revalidatePath(`${PROPERTIES_PATH}/${data.id}`);
  return { ok: true };
}

/** Удаляет объект организации (дочерние записи каскадируются в БД). */
export async function deleteProperty(propertyId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.delete")) {
    return {
      ok: false,
      error: "You do not have permission to delete properties.",
    };
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", propertyId)
    .maybeSingle();
  if (!existing) {
    return { ok: false, error: "Property not found." };
  }
  if (!canEditProperty(context, existing)) {
    return { ok: false, error: "You cannot delete this property." };
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("organization_id", context.organization.id);
  if (error) {
    return { ok: false, error: "Could not delete the property." };
  }

  await dispatchWebhookEvent({
    organizationId: context.organization.id,
    eventType: "property.deleted",
    entityType: "property",
    entityId: propertyId,
    payload: { property_id: propertyId },
  });

  revalidatePath(PROPERTIES_PATH);
  return { ok: true };
}
