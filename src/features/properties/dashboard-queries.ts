import { createClient } from "@/lib/supabase/server";

import type {
  Amenity,
  AmenityCategory,
  Property,
  PropertyLocation,
  PropertyMedia,
  PropertyPrice,
  PropertyTranslation,
} from "./types";

/** Строка списка объектов в dashboard. */
export interface PropertyListItem {
  id: string;
  title: string;
  slug: string;
  propertyType: Property["property_type"];
  purpose: Property["purpose"];
  status: Property["status"];
  updatedAt: string;
}

/**
 * Список объектов организации. RLS дополнительно ограничивает выборку
 * собственными объектами агента, если у него нет properties.manage_all.
 */
export async function listProperties(
  organizationId: string,
  filters: { q?: string; status?: Property["status"] } = {},
): Promise<PropertyListItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("properties")
    .select("id, title, slug, property_type, purpose, status, updated_at")
    .eq("organization_id", organizationId);
  if (filters.q) {
    query = query.ilike("title", `%${filters.q}%`);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  const { data } = await query.order("updated_at", { ascending: false });

  return (data ?? []).map((property) => ({
    id: property.id,
    title: property.title,
    slug: property.slug,
    propertyType: property.property_type,
    purpose: property.purpose,
    status: property.status,
    updatedAt: property.updated_at,
  }));
}

/** Полный набор данных объекта для формы редактирования. */
export interface PropertyEditData {
  property: Property;
  translation: PropertyTranslation | null;
  price: PropertyPrice | null;
  location: PropertyLocation | null;
  media: PropertyMedia[];
  amenityIds: string[];
}

/** Данные одного объекта организации для редактирования. */
export async function getPropertyForEdit(
  organizationId: string,
  propertyId: string,
  locale: string,
): Promise<PropertyEditData | null> {
  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", propertyId)
    .maybeSingle();

  if (!property) {
    return null;
  }

  const [translation, price, location, media, amenities] = await Promise.all([
    supabase
      .from("property_translations")
      .select("*")
      .eq("property_id", propertyId)
      .eq("locale", locale)
      .maybeSingle(),
    supabase
      .from("property_prices")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("property_locations")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle(),
    supabase
      .from("property_media")
      .select("*")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("property_amenities")
      .select("amenity_id")
      .eq("property_id", propertyId),
  ]);

  return {
    property,
    translation: translation.data,
    price: price.data,
    location: location.data,
    media: media.data ?? [],
    amenityIds: (amenities.data ?? []).map((row) => row.amenity_id),
  };
}

/** Каталог удобств: системные (organization_id null) + кастомные организации. */
export interface AmenityCatalog {
  categories: AmenityCategory[];
  amenities: Amenity[];
}

/** Категории и удобства, доступные организации. */
export async function getAmenityCatalog(
  organizationId: string,
): Promise<AmenityCatalog> {
  const supabase = createClient();
  const orgFilter = `organization_id.is.null,organization_id.eq.${organizationId}`;
  const [categories, amenities] = await Promise.all([
    supabase
      .from("amenity_categories")
      .select("*")
      .or(orgFilter)
      .order("sort_order", { ascending: true }),
    supabase
      .from("amenities")
      .select("*")
      .or(orgFilter)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    categories: categories.data ?? [],
    amenities: amenities.data ?? [],
  };
}
