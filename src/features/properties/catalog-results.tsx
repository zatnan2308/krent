"use client";

import * as React from "react";

import { CatalogViewToggle } from "@/features/properties/catalog-view-toggle";
import { PropertyCard } from "@/features/properties/property-card";
import type { PublicPropertyCard } from "@/features/properties/queries";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/lib/i18n";

interface Props {
  items: PublicPropertyCard[];
  locale: Locale;
  totalLabel: string;
}

function formatPrice(price: PublicPropertyCard["price"]): string | null {
  if (!price) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency,
      maximumFractionDigits: 0,
    }).format(price.amount);
  } catch {
    return `${price.amount} ${price.currency}`;
  }
}

function locationOf(card: PublicPropertyCard): string {
  return [card.city, card.area].filter(Boolean).join(", ");
}

export function CatalogResults({ items, locale, totalLabel }: Props) {
  const [view, setView] = React.useState<"list" | "map">("list");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{totalLabel}</p>
        <CatalogViewToggle active={view} onChange={setView} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No properties found"
          description="Try adjusting or resetting the filters."
        />
      ) : view === "list" ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((card) => (
            <PropertyCard key={card.id} card={card} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/20 p-6 text-center">
            <p className="text-sm font-medium">Map view</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pins on the map require a Maps SDK (Leaflet or Mapbox) and an
              API key. Connect one in Dashboard → Integrations.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((card) => {
              const formatted = formatPrice(card.price);
              const loc = locationOf(card);
              return (
                <li
                  key={card.id}
                  className="rounded-md border bg-background p-3 text-sm"
                >
                  <p className="font-medium">{card.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {loc || "Location hidden"}
                  </p>
                  {formatted ? (
                    <p className="text-sm font-semibold">{formatted}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
