import type { PortalType } from "./types";

export const PORTAL_TYPE_OPTIONS: { value: PortalType; label: string }[] = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "guest", label: "Guest" },
];

export const PORTAL_TYPE_LABELS: Record<PortalType, string> = {
  buyer: "Buyer",
  seller: "Seller",
  guest: "Guest",
};

export const PORTAL_TYPE_DESCRIPTIONS: Record<PortalType, string> = {
  buyer: "Saved properties, searches and showing requests.",
  seller: "Your listings, inquiries and showings.",
  guest: "Your bookings and stay details.",
};
