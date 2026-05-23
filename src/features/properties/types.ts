import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц модуля объектов ----------------------
export type Property = Tables<"properties">;
export type PropertyTranslation = Tables<"property_translations">;
export type PropertyPrice = Tables<"property_prices">;
export type PropertyMedia = Tables<"property_media">;
export type PropertyVideo = Tables<"property_videos">;
export type PropertyDocument = Tables<"property_documents">;
export type PropertyLocation = Tables<"property_locations">;
export type NearbyPlace = Tables<"nearby_places">;
export type Amenity = Tables<"amenities">;
export type AmenityCategory = Tables<"amenity_categories">;

// ---- Алиасы enum-типов ----------------------------------------
export type PropertyType = Enums<"property_type">;
export type PropertyPurpose = Enums<"property_purpose">;
export type PropertyStatus = Enums<"property_status">;
export type PropertyVisibility = Enums<"property_visibility">;
export type PricePeriod = Enums<"price_period">;
export type PriceDisplayType = Enums<"price_display_type">;
export type SizeUnit = Enums<"size_unit">;
export type AddressVisibility = Enums<"address_visibility">;
export type MediaCategory = Enums<"media_category">;
export type VideoType = Enums<"video_type">;
export type DocumentType = Enums<"document_type">;
