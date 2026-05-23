/**
 * Реестр модулей white-label платформы.
 *
 * Каждая организация (арендатор) использует подмножество модулей. Core-модули
 * включены всегда; optional-модули — подключаемые дополнения. Реестр является
 * единственным источником метаданных модулей и их зависимостей; его читают
 * слой управления функциями и интерфейс Super Admin.
 */

export const MODULE_IDS = {
  properties: "properties",
  sales: "sales",
  longTermRental: "long_term_rental",
  shortTermRental: "short_term_rental",
  bookings: "bookings",
  crm: "crm",
  payments: "payments",
  cryptoPayments: "crypto_payments",
  calendar: "calendar",
  chat: "chat",
  email: "email",
  emailCampaigns: "email_campaigns",
  seo: "seo",
  analytics: "analytics",
  marketing: "marketing",
  buyerPortal: "buyer_portal",
  sellerPortal: "seller_portal",
  guestPortal: "guest_portal",
  apiAccess: "api_access",
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  /** Core-модули включены всегда и не отключаются для организации. */
  core: boolean;
  /** Optional-модули (дополнения) по умолчанию выключены. */
  optional: boolean;
  /** Модули, которые должны быть включены для работы этого модуля. */
  dependsOn: ModuleId[];
}

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  properties: {
    id: "properties",
    name: "Properties",
    description: "Property catalogue with media and documents.",
    core: true,
    optional: false,
    dependsOn: [],
  },
  crm: {
    id: "crm",
    name: "CRM",
    description: "Leads, contacts and deal pipeline.",
    core: true,
    optional: false,
    dependsOn: [],
  },
  sales: {
    id: "sales",
    name: "Sales",
    description: "Property sale listings and transactions.",
    core: false,
    optional: false,
    dependsOn: ["properties"],
  },
  long_term_rental: {
    id: "long_term_rental",
    name: "Long-term Rental",
    description: "Long-term lease listings and tenancy management.",
    core: false,
    optional: false,
    dependsOn: ["properties"],
  },
  short_term_rental: {
    id: "short_term_rental",
    name: "Short-term Rental",
    description: "Nightly rental listings and availability.",
    core: false,
    optional: false,
    dependsOn: ["properties"],
  },
  bookings: {
    id: "bookings",
    name: "Bookings",
    description: "Direct booking flow and reservation management.",
    core: false,
    optional: false,
    dependsOn: ["short_term_rental"],
  },
  calendar: {
    id: "calendar",
    name: "Calendar",
    description: "Availability calendar with iCal and Google sync.",
    core: false,
    optional: false,
    dependsOn: [],
  },
  payments: {
    id: "payments",
    name: "Payments",
    description: "Card payments and payouts via Stripe and PayPal.",
    core: false,
    optional: false,
    dependsOn: [],
  },
  crypto_payments: {
    id: "crypto_payments",
    name: "Crypto Payments",
    description: "Optional cryptocurrency payment option.",
    core: false,
    optional: true,
    dependsOn: ["payments"],
  },
  chat: {
    id: "chat",
    name: "Chat",
    description: "Client-to-realtor messaging.",
    core: false,
    optional: false,
    dependsOn: [],
  },
  email: {
    id: "email",
    name: "Email",
    description: "Transactional email notifications.",
    core: false,
    optional: false,
    dependsOn: [],
  },
  email_campaigns: {
    id: "email_campaigns",
    name: "Email Campaigns",
    description: "Email builder and bulk campaigns.",
    core: false,
    optional: false,
    dependsOn: ["email"],
  },
  seo: {
    id: "seo",
    name: "SEO",
    description: "SEO engine and Search Console dashboard.",
    core: false,
    optional: false,
    dependsOn: [],
  },
  analytics: {
    id: "analytics",
    name: "Analytics",
    description: "Traffic analytics and UTM attribution.",
    core: false,
    optional: false,
    dependsOn: [],
  },
  marketing: {
    id: "marketing",
    name: "Marketing",
    description: "Google Ads and Meta Ads integrations.",
    core: false,
    optional: false,
    dependsOn: ["analytics"],
  },
  buyer_portal: {
    id: "buyer_portal",
    name: "Buyer Portal",
    description: "Self-service portal for buyers.",
    core: false,
    optional: false,
    dependsOn: ["sales"],
  },
  seller_portal: {
    id: "seller_portal",
    name: "Seller Portal",
    description: "Self-service portal for sellers.",
    core: false,
    optional: false,
    dependsOn: ["sales"],
  },
  guest_portal: {
    id: "guest_portal",
    name: "Guest Portal",
    description: "Self-service portal for booking guests.",
    core: false,
    optional: false,
    dependsOn: ["bookings"],
  },
  api_access: {
    id: "api_access",
    name: "API Access",
    description: "External feed, widget and API for partner sites.",
    core: false,
    optional: false,
    dependsOn: ["properties"],
  },
};
