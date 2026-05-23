import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц CRM ----------------------------------
export type Contact = Tables<"contacts">;
export type Lead = Tables<"leads">;
export type LeadSource = Tables<"lead_sources">;
export type Deal = Tables<"deals">;
export type DealStage = Tables<"deal_stages">;
export type Task = Tables<"tasks">;
export type Note = Tables<"notes">;
export type LeadAttribution = Tables<"lead_attribution">;
export type SavedSearch = Tables<"saved_searches">;
export type FavoriteProperty = Tables<"favorite_properties">;

// ---- Алиасы enum-типов ----------------------------------------
export type LeadType = Enums<"lead_type">;
export type LeadStatus = Enums<"lead_status">;
export type DealStatus = Enums<"deal_status">;
export type TaskStatus = Enums<"task_status">;
export type TaskPriority = Enums<"task_priority">;
export type DeviceType = Enums<"device_type">;
