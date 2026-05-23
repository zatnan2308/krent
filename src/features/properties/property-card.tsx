import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Building2, Maximize, Users } from "lucide-react";

import {
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  formatSize,
} from "@/features/properties/constants";
import type { PublicPropertyCard } from "@/features/properties/queries";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_CURRENCY, isCurrencyCode } from "@/lib/currency/config";
import { formatPrice } from "@/lib/currency/format";
import type { Locale } from "@/lib/i18n";

/** Текст цены карточки с учётом режима отображения (hidden / upon_request). */
function cardPriceText(
  card: PublicPropertyCard,
  locale: Locale,
): string | null {
  const price = card.price;
  if (!price || price.displayType === "hidden") {
    return null;
  }
  if (price.displayType === "upon_request") {
    return "Price on request";
  }
  const currency = isCurrencyCode(price.currency)
    ? price.currency
    : DEFAULT_CURRENCY;
  return formatPrice(price.amount, currency, locale, price.pricePeriod);
}

interface PropertyCardProps {
  card: PublicPropertyCard;
  locale: Locale;
}

/** Карточка объекта в публичном каталоге. */
export function PropertyCard({ card, locale }: PropertyCardProps) {
  const href = `/${locale}/properties/${card.slug}`;
  const price = cardPriceText(card, locale);
  const location = [card.area, card.city]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {card.coverImageUrl ? (
          <Image
            src={card.coverImageUrl}
            alt={card.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Building2 className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge>{PROPERTY_PURPOSE_LABELS[card.purpose]}</Badge>
          {card.status !== "active" ? (
            <Badge variant="secondary">
              {PROPERTY_STATUS_LABELS[card.status]}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {price ? (
          <p className="text-lg font-semibold text-primary">{price}</p>
        ) : null}
        <h3 className="line-clamp-1 font-medium">{card.title}</h3>
        <p className="text-sm text-muted-foreground">
          {PROPERTY_TYPE_LABELS[card.propertyType]}
          {location ? ` · ${location}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 text-sm text-muted-foreground">
          {card.bedrooms !== null ? (
            <span className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              {card.bedrooms}
            </span>
          ) : null}
          {card.bathrooms !== null ? (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {card.bathrooms}
            </span>
          ) : null}
          {card.guestCapacity !== null ? (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {card.guestCapacity}
            </span>
          ) : null}
          {card.size !== null ? (
            <span className="flex items-center gap-1">
              <Maximize className="h-4 w-4" />
              {formatSize(card.size, card.sizeUnit)}
            </span>
          ) : null}
        </div>
        {card.agentName ? (
          <p className="text-xs text-muted-foreground">
            Listed by {card.agentName}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
