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

/** Короткий случайный суффикс — гарантирует уникальность slug при создании.
 *  Берём crypto-энтропию (не Math.random) — меньше шанс коллизии. */
function randomSlugSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
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
    // Маловероятная коллизия slug — честно просим повторить, а не «не удалось».
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "A property with a similar name already exists. Please try again.",
      };
    }
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

  // ---- Назначение агентов (только при properties.manage_all) --
  // Обычный агент не может переназначать объект — поля игнорируются.
  let agentFields:
    | { assigned_agent_id: string | null; co_agent_ids: string[] }
    | null = null;
  if (hasPermission(context, "properties.manage_all")) {
    const coAgents = [...new Set(data.coAgentIds)].filter(
      (id) => id !== data.assignedAgentId,
    );
    const requestedIds = [
      ...(data.assignedAgentId ? [data.assignedAgentId] : []),
      ...coAgents,
    ];
    if (requestedIds.length > 0) {
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .in("user_id", requestedIds);
      const validIds = new Set((members ?? []).map((m) => m.user_id));
      if (data.assignedAgentId && !validIds.has(data.assignedAgentId)) {
        return {
          ok: false,
          error: "Assigned agent is not a member of this organization.",
        };
      }
      if (coAgents.some((id) => !validIds.has(id))) {
        return {
          ok: false,
          error: "A selected co-agent is not a member of this organization.",
        };
      }
    }
    agentFields = {
      assigned_agent_id: data.assignedAgentId,
      co_agent_ids: coAgents,
    };
  }

  // ---- properties --------------------------------------------
  const { error: propertyError } = await supabase
    .from("properties")
    .update({
      ...(agentFields ?? {}),
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

  // ---- property_prices (1 цена; для mixed — sale + rent) -----
  // Sale-строка несёт price_period='sale', rent-строка — month/week/night;
  // по периоду их и различаем при показе и в брони. Реконсиляция —
  // delete-all + insert (чистая замена для 1 или 2 строк).
  const toPriceRow = (p: NonNullable<typeof data.price>) => ({
    property_id: data.id,
    organization_id: organizationId,
    amount: p.amount,
    currency: p.currency,
    price_period: p.pricePeriod,
    display_type: p.displayType,
    old_amount: p.oldAmount,
    security_deposit: p.securityDeposit,
    cleaning_fee: p.cleaningFee,
    taxes: p.taxes,
  });
  const priceRows = [data.price, data.rentPrice]
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map(toPriceRow);

  // Снимок прежних цен для отката: delete-then-insert идёт без транзакции
  // (supabase-js не умеет клиентские транзакции), поэтому при сбое insert
  // восстанавливаем старые строки, чтобы у объекта не осталось 0 цен.
  const { data: priorPrices } = await supabase
    .from("property_prices")
    .select(
      "amount, currency, price_period, display_type, old_amount, security_deposit, cleaning_fee, taxes",
    )
    .eq("property_id", data.id);

  await supabase.from("property_prices").delete().eq("property_id", data.id);
  if (priceRows.length > 0) {
    const { error: priceError } = await supabase
      .from("property_prices")
      .insert(priceRows);
    if (priceError) {
      if (priorPrices && priorPrices.length > 0) {
        await supabase.from("property_prices").insert(
          priorPrices.map((row) => ({
            ...row,
            property_id: data.id,
            organization_id: organizationId,
          })),
        );
      }
      return { ok: false, error: "Could not save the price." };
    }
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
