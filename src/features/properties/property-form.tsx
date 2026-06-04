"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { deleteProperty, updateProperty } from "@/features/properties/actions";
import {
  ADDRESS_VISIBILITY_OPTIONS,
  PRICE_DISPLAY_OPTIONS,
  PRICE_PERIOD_OPTIONS,
  PROPERTY_PURPOSE_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_VISIBILITY_OPTIONS,
  SIZE_UNIT_OPTIONS,
  type SelectOption,
} from "@/features/properties/constants";
import type {
  AmenityCatalog,
  PropertyEditData,
} from "@/features/properties/dashboard-queries";
import type { UpdatePropertyInput } from "@/features/properties/schema";
import type {
  AddressVisibility,
  PriceDisplayType,
  PricePeriod,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  PropertyVisibility,
  SizeUnit,
} from "@/features/properties/types";
import { PropertyMediaManager } from "@/features/properties/property-media-manager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency/config";
import { ROUTES } from "@/lib/constants/routes";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Внутреннее состояние формы. Числовые поля хранятся строками. */
interface FormState {
  title: string;
  slug: string;
  description: string;
  propertyType: PropertyType;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  visibility: PropertyVisibility;
  seoTitle: string;
  seoDescription: string;
  bedrooms: string;
  bathrooms: string;
  beds: string;
  guestCapacity: string;
  size: string;
  sizeUnit: SizeUnit;
  lotSize: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  parking: string;
  garage: boolean;
  listingView: string;
  furnishing: string;
  completion: string;
  ownership: string;
  rentalYield: string;
  lifestyleTags: string;
  badge: string;
  priceEnabled: boolean;
  amount: string;
  currency: CurrencyCode;
  pricePeriod: PricePeriod;
  displayType: PriceDisplayType;
  oldAmount: string;
  securityDeposit: string;
  cleaningFee: string;
  taxes: string;
  rentEnabled: boolean;
  rentAmount: string;
  rentCurrency: CurrencyCode;
  rentPricePeriod: PricePeriod;
  rentDisplayType: PriceDisplayType;
  rentOldAmount: string;
  rentSecurityDeposit: string;
  rentCleaningFee: string;
  rentTaxes: string;
  country: string;
  city: string;
  area: string;
  address: string;
  publicAddress: string;
  latitude: string;
  longitude: string;
  exactAddressVisibility: AddressVisibility;
}

function numToStr(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function toInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveCurrency(value: string | null | undefined): CurrencyCode {
  return value && isCurrencyCode(value) ? value : DEFAULT_CURRENCY;
}

/** Поле формы: подпись над контролом. */
function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Нативный select по списку вариантов enum. */
function NativeSelect<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <select
      id={id}
      className={FIELD_CLASS}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface PropertyFormProps {
  initial: PropertyEditData;
  amenityCatalog: AmenityCatalog;
  currentUserId: string;
  canDelete: boolean;
}

/** Редактор объекта с вкладками: все данные сохраняются одной кнопкой. */
export function PropertyForm({
  initial,
  amenityCatalog,
  currentUserId,
  canDelete,
}: PropertyFormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(() => ({
    title: initial.property.title,
    slug: initial.property.slug,
    description: initial.translation?.description ?? "",
    propertyType: initial.property.property_type,
    purpose: initial.property.purpose,
    status: initial.property.status,
    visibility: initial.property.visibility,
    seoTitle: initial.translation?.seo_title ?? "",
    seoDescription: initial.translation?.seo_description ?? "",
    bedrooms: numToStr(initial.property.bedrooms),
    bathrooms: numToStr(initial.property.bathrooms),
    beds: numToStr(initial.property.beds),
    guestCapacity: numToStr(initial.property.guest_capacity),
    size: numToStr(initial.property.size),
    sizeUnit: initial.property.size_unit,
    lotSize: numToStr(initial.property.lot_size),
    floor: numToStr(initial.property.floor),
    totalFloors: numToStr(initial.property.total_floors),
    yearBuilt: numToStr(initial.property.year_built),
    parking: numToStr(initial.property.parking),
    garage: initial.property.garage,
    listingView: initial.property.listing_view ?? "",
    furnishing: initial.property.furnishing ?? "",
    completion: initial.property.completion ?? "",
    ownership: initial.property.ownership ?? "",
    rentalYield: numToStr(initial.property.rental_yield),
    lifestyleTags: (initial.property.lifestyle_tags ?? []).join(", "),
    badge: initial.property.badge ?? "",
    priceEnabled: initial.price !== null,
    amount: numToStr(initial.price?.amount ?? null),
    currency: resolveCurrency(initial.price?.currency),
    pricePeriod: initial.price?.price_period ?? "sale",
    displayType: initial.price?.display_type ?? "visible",
    oldAmount: numToStr(initial.price?.old_amount ?? null),
    securityDeposit: numToStr(initial.price?.security_deposit ?? null),
    cleaningFee: numToStr(initial.price?.cleaning_fee ?? null),
    taxes: numToStr(initial.price?.taxes ?? null),
    rentEnabled: initial.rentPrice !== null,
    rentAmount: numToStr(initial.rentPrice?.amount ?? null),
    rentCurrency: resolveCurrency(initial.rentPrice?.currency),
    rentPricePeriod: initial.rentPrice?.price_period ?? "month",
    rentDisplayType: initial.rentPrice?.display_type ?? "visible",
    rentOldAmount: numToStr(initial.rentPrice?.old_amount ?? null),
    rentSecurityDeposit: numToStr(initial.rentPrice?.security_deposit ?? null),
    rentCleaningFee: numToStr(initial.rentPrice?.cleaning_fee ?? null),
    rentTaxes: numToStr(initial.rentPrice?.taxes ?? null),
    country: initial.location?.country ?? "",
    city: initial.location?.city ?? "",
    area: initial.location?.area ?? "",
    address: initial.location?.address ?? "",
    publicAddress: initial.location?.public_address ?? "",
    latitude: numToStr(initial.location?.latitude ?? null),
    longitude: numToStr(initial.location?.longitude ?? null),
    exactAddressVisibility:
      initial.location?.exact_address_visibility ?? "approximate",
  }));
  const [amenityIds, setAmenityIds] = React.useState<Set<string>>(
    () => new Set(initial.amenityIds),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next: FormState = { ...prev };
      next[key] = value;
      return next;
    });
    setSaved(false);
  }

  function toggleAmenity(amenityId: string) {
    setAmenityIds((prev) => {
      const next = new Set(prev);
      if (next.has(amenityId)) {
        next.delete(amenityId);
      } else {
        next.add(amenityId);
      }
      return next;
    });
    setSaved(false);
  }

  function buildInput(): UpdatePropertyInput {
    return {
      id: initial.property.id,
      title: form.title.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      propertyType: form.propertyType,
      purpose: form.purpose,
      status: form.status,
      visibility: form.visibility,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      bedrooms: toInt(form.bedrooms),
      bathrooms: toNum(form.bathrooms),
      beds: toInt(form.beds),
      guestCapacity: toInt(form.guestCapacity),
      size: toNum(form.size),
      sizeUnit: form.sizeUnit,
      lotSize: toNum(form.lotSize),
      floor: toInt(form.floor),
      totalFloors: toInt(form.totalFloors),
      yearBuilt: toInt(form.yearBuilt),
      parking: toInt(form.parking),
      garage: form.garage,
      listingView: form.listingView.trim() || null,
      furnishing: form.furnishing.trim() || null,
      completion: form.completion.trim() || null,
      ownership: form.ownership.trim() || null,
      rentalYield: toNum(form.rentalYield),
      lifestyleTags: form.lifestyleTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
      badge: form.badge.trim() || null,
      price: form.priceEnabled
        ? {
            amount: toNum(form.amount) ?? 0,
            currency: form.currency,
            // У mixed-объекта основная цена — продажа (sale); вторую цену
            // (аренду) несёт rentPrice ниже.
            pricePeriod:
              form.purpose === "mixed" ? "sale" : form.pricePeriod,
            displayType: form.displayType,
            oldAmount: toNum(form.oldAmount),
            securityDeposit: toNum(form.securityDeposit),
            cleaningFee: toNum(form.cleaningFee),
            taxes: toNum(form.taxes),
          }
        : null,
      rentPrice:
        form.purpose === "mixed" && form.rentEnabled
          ? {
              amount: toNum(form.rentAmount) ?? 0,
              currency: form.rentCurrency,
              pricePeriod: form.rentPricePeriod,
              displayType: form.rentDisplayType,
              oldAmount: toNum(form.rentOldAmount),
              securityDeposit: toNum(form.rentSecurityDeposit),
              cleaningFee: toNum(form.rentCleaningFee),
              taxes: toNum(form.rentTaxes),
            }
          : null,
      location: {
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        area: form.area.trim() || null,
        address: form.address.trim() || null,
        publicAddress: form.publicAddress.trim() || null,
        latitude: toNum(form.latitude),
        longitude: toNum(form.longitude),
        exactAddressVisibility: form.exactAddressVisibility,
      },
      amenityIds: [...amenityIds],
    };
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateProperty(buildInput());
    setPending(false);
    if (result.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete() {
    setDeletePending(true);
    setError(null);
    const result = await deleteProperty(initial.property.id);
    if (result.ok) {
      router.push(ROUTES.dashboard.properties);
      router.refresh();
    } else {
      setError(result.error);
      setDeletePending(false);
    }
  }

  const categoryIds = new Set(amenityCatalog.categories.map((c) => c.id));
  const uncategorized = amenityCatalog.amenities.filter(
    (amenity) =>
      amenity.category_id === null || !categoryIds.has(amenity.category_id),
  );
  const assignedLabel =
    initial.property.assigned_agent_id === null
      ? "Unassigned"
      : initial.property.assigned_agent_id === currentUserId
        ? "Assigned to you"
        : "Assigned to another agent";

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ---- Overview ---- */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Title" htmlFor="title">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Slug"
                  htmlFor="slug"
                  hint="Used in the public URL."
                >
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(event) => update("slug", event.target.value)}
                  />
                </Field>
                <Field label="Type" htmlFor="type">
                  <NativeSelect
                    id="type"
                    value={form.propertyType}
                    options={PROPERTY_TYPE_OPTIONS}
                    onChange={(value) => update("propertyType", value)}
                  />
                </Field>
                <Field label="Purpose" htmlFor="purpose">
                  <NativeSelect
                    id="purpose"
                    value={form.purpose}
                    options={PROPERTY_PURPOSE_OPTIONS}
                    onChange={(value) => update("purpose", value)}
                  />
                </Field>
              </div>
              <Field label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  rows={6}
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Details ---- */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Bedrooms" htmlFor="bedrooms">
                  <Input
                    id="bedrooms"
                    type="number"
                    min={0}
                    value={form.bedrooms}
                    onChange={(event) =>
                      update("bedrooms", event.target.value)
                    }
                  />
                </Field>
                <Field label="Bathrooms" htmlFor="bathrooms">
                  <Input
                    id="bathrooms"
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.bathrooms}
                    onChange={(event) =>
                      update("bathrooms", event.target.value)
                    }
                  />
                </Field>
                <Field label="Beds" htmlFor="beds">
                  <Input
                    id="beds"
                    type="number"
                    min={0}
                    value={form.beds}
                    onChange={(event) => update("beds", event.target.value)}
                  />
                </Field>
                <Field label="Guest capacity" htmlFor="guestCapacity">
                  <Input
                    id="guestCapacity"
                    type="number"
                    min={0}
                    value={form.guestCapacity}
                    onChange={(event) =>
                      update("guestCapacity", event.target.value)
                    }
                  />
                </Field>
                <Field label="Size" htmlFor="size">
                  <Input
                    id="size"
                    type="number"
                    min={0}
                    step="any"
                    value={form.size}
                    onChange={(event) => update("size", event.target.value)}
                  />
                </Field>
                <Field label="Size unit" htmlFor="sizeUnit">
                  <NativeSelect
                    id="sizeUnit"
                    value={form.sizeUnit}
                    options={SIZE_UNIT_OPTIONS}
                    onChange={(value) => update("sizeUnit", value)}
                  />
                </Field>
                <Field label="Lot size" htmlFor="lotSize">
                  <Input
                    id="lotSize"
                    type="number"
                    min={0}
                    step="any"
                    value={form.lotSize}
                    onChange={(event) =>
                      update("lotSize", event.target.value)
                    }
                  />
                </Field>
                <Field label="Floor" htmlFor="floor">
                  <Input
                    id="floor"
                    type="number"
                    value={form.floor}
                    onChange={(event) => update("floor", event.target.value)}
                  />
                </Field>
                <Field label="Total floors" htmlFor="totalFloors">
                  <Input
                    id="totalFloors"
                    type="number"
                    min={0}
                    value={form.totalFloors}
                    onChange={(event) =>
                      update("totalFloors", event.target.value)
                    }
                  />
                </Field>
                <Field label="Year built" htmlFor="yearBuilt">
                  <Input
                    id="yearBuilt"
                    type="number"
                    value={form.yearBuilt}
                    onChange={(event) =>
                      update("yearBuilt", event.target.value)
                    }
                  />
                </Field>
                <Field label="Parking spots" htmlFor="parking">
                  <Input
                    id="parking"
                    type="number"
                    min={0}
                    value={form.parking}
                    onChange={(event) =>
                      update("parking", event.target.value)
                    }
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="garage"
                  checked={form.garage}
                  onCheckedChange={(checked) =>
                    update("garage", checked === true)
                  }
                />
                <label htmlFor="garage" className="text-sm font-medium">
                  Has a garage
                </label>
              </div>
            </CardContent>
          </Card>

          {/* ---- Catalogue attributes (фильтры публичного каталога) ---- */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Catalogue attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Power the public catalogue filters: View, Furnishing, Completion,
                Ownership, Rental yield, Lifestyle tags and the card Badge.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="View"
                  htmlFor="listingView"
                  hint="e.g. Sea view, Marina view"
                >
                  <Input
                    id="listingView"
                    value={form.listingView}
                    onChange={(event) =>
                      update("listingView", event.target.value)
                    }
                  />
                </Field>
                <Field label="Furnishing" htmlFor="furnishing">
                  <select
                    id="furnishing"
                    className={FIELD_CLASS}
                    value={form.furnishing}
                    onChange={(event) =>
                      update("furnishing", event.target.value)
                    }
                  >
                    <option value="">—</option>
                    <option value="Furnished">Furnished</option>
                    <option value="Semi-furnished">Semi-furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </Field>
                <Field label="Ownership" htmlFor="ownership">
                  <select
                    id="ownership"
                    className={FIELD_CLASS}
                    value={form.ownership}
                    onChange={(event) =>
                      update("ownership", event.target.value)
                    }
                  >
                    <option value="">—</option>
                    <option value="Freehold">Freehold</option>
                    <option value="Leasehold">Leasehold</option>
                  </select>
                </Field>
                <Field
                  label="Completion"
                  htmlFor="completion"
                  hint={'"Ready" or "Off-plan · Q3 2027"'}
                >
                  <Input
                    id="completion"
                    value={form.completion}
                    onChange={(event) =>
                      update("completion", event.target.value)
                    }
                  />
                </Field>
                <Field label="Rental yield (%)" htmlFor="rentalYield">
                  <Input
                    id="rentalYield"
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.rentalYield}
                    onChange={(event) =>
                      update("rentalYield", event.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Badge"
                  htmlFor="badge"
                  hint="e.g. Off-market, New"
                >
                  <Input
                    id="badge"
                    value={form.badge}
                    onChange={(event) => update("badge", event.target.value)}
                  />
                </Field>
                <Field
                  label="Lifestyle tags"
                  htmlFor="lifestyleTags"
                  hint="Comma-separated: Beachfront, Investment"
                >
                  <Input
                    id="lifestyleTags"
                    value={form.lifestyleTags}
                    onChange={(event) =>
                      update("lifestyleTags", event.target.value)
                    }
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Pricing ---- */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="priceEnabled"
                  checked={form.priceEnabled}
                  onCheckedChange={(checked) =>
                    update("priceEnabled", checked === true)
                  }
                />
                <label
                  htmlFor="priceEnabled"
                  className="text-sm font-medium"
                >
                  This property has a price
                </label>
              </div>
              {form.priceEnabled ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Amount" htmlFor="amount">
                    <Input
                      id="amount"
                      type="number"
                      min={0}
                      step="any"
                      value={form.amount}
                      onChange={(event) =>
                        update("amount", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Currency" htmlFor="currency">
                    <select
                      id="currency"
                      className={FIELD_CLASS}
                      value={form.currency}
                      onChange={(event) =>
                        update(
                          "currency",
                          event.target.value as CurrencyCode,
                        )
                      }
                    >
                      {CURRENCIES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.purpose === "mixed" ? (
                    <Field label="Price period">
                      <p className="flex h-10 items-center text-sm text-muted-foreground">
                        Sale price (set rent below)
                      </p>
                    </Field>
                  ) : (
                    <Field label="Price period" htmlFor="pricePeriod">
                      <NativeSelect
                        id="pricePeriod"
                        value={form.pricePeriod}
                        options={PRICE_PERIOD_OPTIONS}
                        onChange={(value) => update("pricePeriod", value)}
                      />
                    </Field>
                  )}
                  <Field label="Price display" htmlFor="displayType">
                    <NativeSelect
                      id="displayType"
                      value={form.displayType}
                      options={PRICE_DISPLAY_OPTIONS}
                      onChange={(value) => update("displayType", value)}
                    />
                  </Field>
                  <Field
                    label="Old amount"
                    htmlFor="oldAmount"
                    hint="Shown as a crossed-out price."
                  >
                    <Input
                      id="oldAmount"
                      type="number"
                      min={0}
                      step="any"
                      value={form.oldAmount}
                      onChange={(event) =>
                        update("oldAmount", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Security deposit" htmlFor="securityDeposit">
                    <Input
                      id="securityDeposit"
                      type="number"
                      min={0}
                      step="any"
                      value={form.securityDeposit}
                      onChange={(event) =>
                        update("securityDeposit", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Cleaning fee" htmlFor="cleaningFee">
                    <Input
                      id="cleaningFee"
                      type="number"
                      min={0}
                      step="any"
                      value={form.cleaningFee}
                      onChange={(event) =>
                        update("cleaningFee", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Taxes" htmlFor="taxes">
                    <Input
                      id="taxes"
                      type="number"
                      min={0}
                      step="any"
                      value={form.taxes}
                      onChange={(event) =>
                        update("taxes", event.target.value)
                      }
                    />
                  </Field>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enable the checkbox above to set a price for this property.
                </p>
              )}

              {form.purpose === "mixed" ? (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rentEnabled"
                      checked={form.rentEnabled}
                      onCheckedChange={(checked) =>
                        update("rentEnabled", checked === true)
                      }
                    />
                    <label
                      htmlFor="rentEnabled"
                      className="text-sm font-medium"
                    >
                      Add a separate rent price
                    </label>
                  </div>
                  {form.rentEnabled ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Rent amount" htmlFor="rentAmount">
                        <Input
                          id="rentAmount"
                          type="number"
                          min={0}
                          step="any"
                          value={form.rentAmount}
                          onChange={(event) =>
                            update("rentAmount", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Currency" htmlFor="rentCurrency">
                        <select
                          id="rentCurrency"
                          className={FIELD_CLASS}
                          value={form.rentCurrency}
                          onChange={(event) =>
                            update(
                              "rentCurrency",
                              event.target.value as CurrencyCode,
                            )
                          }
                        >
                          {CURRENCIES.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Rent period" htmlFor="rentPricePeriod">
                        <NativeSelect
                          id="rentPricePeriod"
                          value={form.rentPricePeriod}
                          options={PRICE_PERIOD_OPTIONS.filter(
                            (option) => option.value !== "sale",
                          )}
                          onChange={(value) =>
                            update("rentPricePeriod", value)
                          }
                        />
                      </Field>
                      <Field label="Price display" htmlFor="rentDisplayType">
                        <NativeSelect
                          id="rentDisplayType"
                          value={form.rentDisplayType}
                          options={PRICE_DISPLAY_OPTIONS}
                          onChange={(value) =>
                            update("rentDisplayType", value)
                          }
                        />
                      </Field>
                      <Field
                        label="Old amount"
                        htmlFor="rentOldAmount"
                        hint="Shown as a crossed-out price."
                      >
                        <Input
                          id="rentOldAmount"
                          type="number"
                          min={0}
                          step="any"
                          value={form.rentOldAmount}
                          onChange={(event) =>
                            update("rentOldAmount", event.target.value)
                          }
                        />
                      </Field>
                      <Field
                        label="Security deposit"
                        htmlFor="rentSecurityDeposit"
                      >
                        <Input
                          id="rentSecurityDeposit"
                          type="number"
                          min={0}
                          step="any"
                          value={form.rentSecurityDeposit}
                          onChange={(event) =>
                            update("rentSecurityDeposit", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Cleaning fee" htmlFor="rentCleaningFee">
                        <Input
                          id="rentCleaningFee"
                          type="number"
                          min={0}
                          step="any"
                          value={form.rentCleaningFee}
                          onChange={(event) =>
                            update("rentCleaningFee", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Taxes" htmlFor="rentTaxes">
                        <Input
                          id="rentTaxes"
                          type="number"
                          min={0}
                          step="any"
                          value={form.rentTaxes}
                          onChange={(event) =>
                            update("rentTaxes", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Show a monthly/weekly/nightly rent price alongside the
                      sale price above.
                    </p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Amenities ---- */}
        <TabsContent value="amenities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Amenities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {amenityCatalog.amenities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No amenities defined yet. Add them in the Amenities manager.
                </p>
              ) : null}
              {amenityCatalog.categories.map((category) => {
                const items = amenityCatalog.amenities.filter(
                  (amenity) => amenity.category_id === category.id,
                );
                if (items.length === 0) {
                  return null;
                }
                return (
                  <div key={category.id} className="space-y-2">
                    <p className="text-sm font-medium">{category.name}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((amenity) => (
                        <div
                          key={amenity.id}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`amenity-${amenity.id}`}
                            checked={amenityIds.has(amenity.id)}
                            onCheckedChange={() => toggleAmenity(amenity.id)}
                          />
                          <label
                            htmlFor={`amenity-${amenity.id}`}
                            className="text-sm"
                          >
                            {amenity.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {uncategorized.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Other</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {uncategorized.map((amenity) => (
                      <div
                        key={amenity.id}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`amenity-${amenity.id}`}
                          checked={amenityIds.has(amenity.id)}
                          onCheckedChange={() => toggleAmenity(amenity.id)}
                        />
                        <label
                          htmlFor={`amenity-${amenity.id}`}
                          className="text-sm"
                        >
                          {amenity.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Media ---- */}
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media</CardTitle>
            </CardHeader>
            <CardContent>
              <PropertyMediaManager
                propertyId={initial.property.id}
                media={initial.media}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Location ---- */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country" htmlFor="country">
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(event) =>
                      update("country", event.target.value)
                    }
                  />
                </Field>
                <Field label="City" htmlFor="city">
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                  />
                </Field>
                <Field label="Area / district" htmlFor="area">
                  <Input
                    id="area"
                    value={form.area}
                    onChange={(event) => update("area", event.target.value)}
                  />
                </Field>
                <Field
                  label="Public address"
                  htmlFor="publicAddress"
                  hint="Shown to visitors when the exact address is hidden."
                >
                  <Input
                    id="publicAddress"
                    value={form.publicAddress}
                    onChange={(event) =>
                      update("publicAddress", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field
                label="Exact address"
                htmlFor="address"
                hint="Internal full address of the property."
              >
                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Latitude" htmlFor="latitude">
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(event) =>
                      update("latitude", event.target.value)
                    }
                  />
                </Field>
                <Field label="Longitude" htmlFor="longitude">
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(event) =>
                      update("longitude", event.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Address visibility"
                  htmlFor="exactAddressVisibility"
                >
                  <NativeSelect
                    id="exactAddressVisibility"
                    value={form.exactAddressVisibility}
                    options={ADDRESS_VISIBILITY_OPTIONS}
                    onChange={(value) =>
                      update("exactAddressVisibility", value)
                    }
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- SEO ---- */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="SEO title" htmlFor="seoTitle">
                <Input
                  id="seoTitle"
                  value={form.seoTitle}
                  onChange={(event) =>
                    update("seoTitle", event.target.value)
                  }
                />
              </Field>
              <Field label="SEO description" htmlFor="seoDescription">
                <Textarea
                  id="seoDescription"
                  rows={3}
                  value={form.seoDescription}
                  onChange={(event) =>
                    update("seoDescription", event.target.value)
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Settings ---- */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status & visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status" htmlFor="status">
                  <NativeSelect
                    id="status"
                    value={form.status}
                    options={PROPERTY_STATUS_OPTIONS}
                    onChange={(value) => update("status", value)}
                  />
                </Field>
                <Field label="Visibility" htmlFor="visibility">
                  <NativeSelect
                    id="visibility"
                    value={form.visibility}
                    options={PROPERTY_VISIBILITY_OPTIONS}
                    onChange={(value) => update("visibility", value)}
                  />
                </Field>
              </div>
              <p className="text-sm text-muted-foreground">
                {assignedLabel}. Created{" "}
                {new Date(initial.property.created_at).toLocaleDateString(
                  "en-US",
                )}
                , updated{" "}
                {new Date(initial.property.updated_at).toLocaleDateString(
                  "en-US",
                )}
                .
              </p>
            </CardContent>
          </Card>
          {canDelete ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Danger zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Deleting a property removes all of its translations, media,
                  prices and other related data.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletePending}
                  onClick={handleDelete}
                >
                  {deletePending ? "Deleting..." : "Delete property"}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-emerald-600">All changes saved.</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push(ROUTES.dashboard.properties)}
        >
          Back to list
        </Button>
      </div>
    </div>
  );
}
