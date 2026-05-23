import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Play } from "lucide-react";

import {
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  VIDEO_TYPE_LABELS,
  formatSize,
} from "@/features/properties/constants";
import { TrackPropertyView } from "@/features/analytics/track-property-view";
import { BookingWidget } from "@/features/bookings/booking-widget";
import { LeadForm } from "@/features/crm/lead-form";
import { getEnabledPaymentOptions } from "@/features/payments/queries";
import { JsonLd } from "@/features/seo/json-ld";
import {
  breadcrumbJsonLd,
  realEstateListingJsonLd,
} from "@/features/seo/jsonld";
import { PropertyCard } from "@/features/properties/property-card";
import { PropertyMap } from "@/features/properties/property-map";
import {
  getPublicProperty,
  getSimilarProperties,
  type PublicPropertyView,
} from "@/features/properties/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency/config";
import { formatCurrency, formatPrice } from "@/lib/currency/format";
import { isLocale, LOCALES, type Locale } from "@/lib/i18n";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  type LocalizedSlugs,
} from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim() !== "",
    )
    .join(", ");
}

/** Адрес для публичного показа с учётом exact_address_visibility. */
function displayAddress(view: PublicPropertyView): string {
  const location = view.location;
  if (!location) {
    return "";
  }
  const general = joinParts(location.area, location.city, location.country);
  switch (location.exact_address_visibility) {
    case "exact":
      return joinParts(location.address) || location.public_address || general;
    case "approximate":
      return location.public_address || general;
    case "hidden":
      return joinParts(location.city, location.country);
    default:
      return general;
  }
}

/** Преобразует ссылку YouTube/Vimeo во встраиваемый URL или возвращает null. */
function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    return {};
  }
  const view = await getPublicProperty(
    site.organization.id,
    params.slug,
    locale,
    site.organization.default_language,
  );
  if (!view) {
    return {};
  }

  const slugFor = (target: Locale): string =>
    `/properties/${view.localizedSlugs[target] ?? view.baseSlug}`;
  const slugMap: LocalizedSlugs = {};
  for (const target of LOCALES) {
    slugMap[target] = slugFor(target);
  }
  const path = slugFor(locale);
  const cover =
    view.media.find((item) => item.category === "cover")?.url ??
    view.media[0]?.url;
  const title = view.seoTitle ?? view.title;
  const description =
    view.seoDescription ??
    (view.description ? view.description.slice(0, 160) : undefined);

  return {
    title,
    description,
    alternates: buildLocaleAlternates(locale, path, slugMap),
    openGraph: {
      title,
      description,
      type: "website",
      url: buildCanonicalUrl(locale, path),
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }

  const view = await getPublicProperty(
    site.organization.id,
    params.slug,
    locale,
    site.organization.default_language,
  );
  if (!view) {
    notFound();
  }

  const property = view.property;
  const similar = await getSimilarProperties(
    site.organization.id,
    property.id,
    property.purpose,
    locale,
    site.organization.default_language,
    3,
  );

  // Галерея: обложка первой, затем по sort_order.
  const gallery = [...view.media].sort((a, b) => {
    if (a.category === "cover" && b.category !== "cover") {
      return -1;
    }
    if (b.category === "cover" && a.category !== "cover") {
      return 1;
    }
    return a.sort_order - b.sort_order;
  });
  const mainImage = gallery[0];
  const thumbs = gallery.slice(1, 9);

  // Цена с учётом режима отображения.
  const priceCurrency: CurrencyCode =
    view.price && isCurrencyCode(view.price.currency)
      ? view.price.currency
      : DEFAULT_CURRENCY;
  const priceText =
    view.price && view.price.displayType === "visible"
      ? formatPrice(
          view.price.amount,
          priceCurrency,
          locale,
          view.price.pricePeriod,
        )
      : null;
  const oldPriceText =
    view.price &&
    view.price.displayType === "visible" &&
    view.price.oldAmount !== null
      ? formatPrice(
          view.price.oldAmount,
          priceCurrency,
          locale,
          view.price.pricePeriod,
        )
      : null;
  const priceLabel = priceText ?? "Price on request";

  // Адрес и карта — точная позиция только при exact_address_visibility.
  const address = displayAddress(view);
  const location = view.location;
  const mapData =
    location &&
    location.latitude !== null &&
    location.longitude !== null &&
    location.exact_address_visibility !== "hidden"
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          precise: location.exact_address_visibility === "exact",
        }
      : null;

  const facts: { label: string; value: string }[] = [];
  if (property.bedrooms !== null) {
    facts.push({ label: "Bedrooms", value: String(property.bedrooms) });
  }
  if (property.bathrooms !== null) {
    facts.push({ label: "Bathrooms", value: String(property.bathrooms) });
  }
  if (property.beds !== null) {
    facts.push({ label: "Beds", value: String(property.beds) });
  }
  if (property.guest_capacity !== null) {
    facts.push({ label: "Guests", value: String(property.guest_capacity) });
  }
  if (property.size !== null) {
    facts.push({
      label: "Size",
      value: formatSize(property.size, property.size_unit),
    });
  }
  if (property.lot_size !== null) {
    facts.push({
      label: "Lot size",
      value: formatSize(property.lot_size, property.size_unit),
    });
  }
  if (property.floor !== null) {
    facts.push({
      label: "Floor",
      value:
        property.total_floors !== null
          ? `${property.floor} / ${property.total_floors}`
          : String(property.floor),
    });
  }
  if (property.year_built !== null) {
    facts.push({ label: "Year built", value: String(property.year_built) });
  }
  if (property.parking !== null) {
    facts.push({ label: "Parking", value: String(property.parking) });
  }
  if (property.garage) {
    facts.push({ label: "Garage", value: "Yes" });
  }

  const fees: { label: string; value: number }[] = [];
  if (view.fees.securityDeposit !== null) {
    fees.push({
      label: "Security deposit",
      value: view.fees.securityDeposit,
    });
  }
  if (view.fees.cleaningFee !== null) {
    fees.push({ label: "Cleaning fee", value: view.fees.cleaningFee });
  }
  if (view.fees.taxes !== null) {
    fees.push({ label: "Taxes", value: view.fees.taxes });
  }

  const isBookable =
    property.purpose === "short_term_rental" || property.purpose === "mixed";
  const inquiryKind = property.purpose === "sale" ? "contact" : "rental";
  const paymentOptions = isBookable
    ? await getEnabledPaymentOptions(site.organization.id)
    : [];
  const canonicalPath = `/properties/${view.localizedSlugs[locale] ?? view.baseSlug}`;
  const canonicalUrl = buildCanonicalUrl(locale, canonicalPath);
  const jsonLd = [
    realEstateListingJsonLd({
      name: view.title,
      url: canonicalUrl,
      description: view.description,
      images: gallery.slice(0, 5).map((item) => item.url),
      price:
        view.price && view.price.displayType === "visible"
          ? view.price.amount
          : null,
      currency: view.price?.currency ?? null,
      address: address || null,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: buildCanonicalUrl(locale, "/") },
      { name: "Properties", url: buildCanonicalUrl(locale, "/listings") },
      { name: view.title, url: canonicalUrl },
    ]),
  ];

  return (
    <article className="container space-y-10 py-10">
      <JsonLd data={jsonLd} />
      <TrackPropertyView propertyId={property.id} />

      <Link
        href={`/${locale}/listings`}
        className="text-sm text-muted-foreground hover:underline"
      >
        &larr; All properties
      </Link>

      {/* Галерея */}
      <div className="space-y-3">
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
          {mainImage ? (
            <Image
              src={mainImage.url}
              alt={mainImage.alt || view.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Building2 className="h-12 w-12" />
            </div>
          )}
        </div>
        {thumbs.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {thumbs.map((item) => (
              <div
                key={item.id}
                className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted"
              >
                <Image
                  src={item.url}
                  alt={item.alt || view.title}
                  fill
                  sizes="(max-width: 768px) 25vw, 200px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Заголовок */}
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge>{PROPERTY_PURPOSE_LABELS[property.purpose]}</Badge>
          <Badge variant="secondary">
            {PROPERTY_TYPE_LABELS[property.property_type]}
          </Badge>
          {property.status !== "active" ? (
            <Badge variant="outline">
              {PROPERTY_STATUS_LABELS[property.status]}
            </Badge>
          ) : null}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {view.title}
        </h1>
        {address ? <p className="text-muted-foreground">{address}</p> : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Основная колонка */}
        <div className="space-y-8">
          {facts.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Key facts</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">
                      {fact.label}
                    </dt>
                    <dd className="text-sm font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {view.description ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Description</h2>
              <p className="whitespace-pre-line text-pretty text-muted-foreground">
                {view.description}
              </p>
            </section>
          ) : null}

          {view.amenities.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {view.amenities.map((amenity) => (
                  <Badge key={amenity.id} variant="secondary">
                    {amenity.name}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {mapData ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Location</h2>
              <PropertyMap
                latitude={mapData.latitude}
                longitude={mapData.longitude}
                precise={mapData.precise}
                label={address || "Approximate location"}
              />
            </section>
          ) : null}

          {view.videos.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Videos</h2>
              <div className="space-y-4">
                {view.videos.map((video) => {
                  const embed = getEmbedUrl(video.url);
                  const label = video.title ?? VIDEO_TYPE_LABELS[video.type];
                  return (
                    <div key={video.id} className="space-y-2">
                      <p className="text-sm font-medium">{label}</p>
                      {embed ? (
                        <div className="aspect-video overflow-hidden rounded-lg border">
                          <iframe
                            src={embed}
                            title={label}
                            allowFullScreen
                            loading="lazy"
                            className="h-full w-full"
                          />
                        </div>
                      ) : (
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Play className="h-4 w-4" />
                          Open {VIDEO_TYPE_LABELS[video.type].toLowerCase()}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {view.nearbyPlaces.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">What&apos;s nearby</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {view.nearbyPlaces.map((place) => (
                  <li
                    key={place.id}
                    className="flex justify-between border-b py-1"
                  >
                    <span>{place.name}</span>
                    {place.distance !== null ? (
                      <span>
                        {place.distance} {place.distance_unit ?? "km"}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Сайдбар */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="space-y-1 pt-6">
              <p className="text-2xl font-bold text-primary">{priceLabel}</p>
              {oldPriceText ? (
                <p className="text-sm text-muted-foreground line-through">
                  {oldPriceText}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {fees.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Additional fees</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {fees.map((fee) => (
                    <li
                      key={fee.label}
                      className="flex justify-between gap-3"
                    >
                      <span className="text-muted-foreground">
                        {fee.label}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(fee.value, priceCurrency, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact the agent</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadForm
                kind={inquiryKind}
                propertyId={property.id}
                locale={locale}
              />
            </CardContent>
          </Card>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Request a viewing
            </summary>
            <div className="mt-4">
              <LeadForm
                kind="showing"
                propertyId={property.id}
                locale={locale}
              />
            </div>
          </details>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Listing agent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{view.agentName ?? "Sales team"}</p>
              <p className="text-sm text-muted-foreground">
                {site.organization.name}
              </p>
            </CardContent>
          </Card>

          {isBookable ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Book this stay</CardTitle>
              </CardHeader>
              <CardContent>
                <BookingWidget
                  propertyId={property.id}
                  locale={locale}
                  guestCapacity={property.guest_capacity}
                  paymentOptions={paymentOptions}
                />
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      {similar.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">
            Similar properties
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((card) => (
              <PropertyCard key={card.id} card={card} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
