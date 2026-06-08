"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createProperty } from "@/features/properties/actions";
import {
  PROPERTY_PURPOSE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "@/features/properties/constants";
import type {
  PropertyPurpose,
  PropertyType,
} from "@/features/properties/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/constants/routes";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Минимальная форма создания объекта; после создания ведёт в редактор. */
export function PropertyCreateForm() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashProperties;
  const [title, setTitle] = React.useState("");
  const [propertyType, setPropertyType] =
    React.useState<PropertyType>("apartment");
  const [purpose, setPurpose] = React.useState<PropertyPurpose>("sale");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      setError(t.titleRequired);
      return;
    }
    setPending(true);
    setError(null);
    const result = await createProperty({
      title: title.trim(),
      propertyType,
      purpose,
    });
    if (result.ok) {
      router.push(`${ROUTES.dashboard.properties}/${result.id}`);
      router.refresh();
    } else {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.propertyBasics}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="property-title" className="text-sm font-medium">
            {t.colTitle}
          </label>
          <Input
            id="property-title"
            value={title}
            placeholder={t.titlePlaceholder}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="property-type" className="text-sm font-medium">
              {t.colType}
            </label>
            <select
              id="property-type"
              className={FIELD_CLASS}
              value={propertyType}
              onChange={(event) =>
                setPropertyType(event.target.value as PropertyType)
              }
            >
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="property-purpose" className="text-sm font-medium">
              {t.colPurpose}
            </label>
            <select
              id="property-purpose"
              className={FIELD_CLASS}
              value={purpose}
              onChange={(event) =>
                setPurpose(event.target.value as PropertyPurpose)
              }
            >
              {PROPERTY_PURPOSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" onClick={handleCreate} disabled={pending}>
          {pending ? t.creating : t.createProperty}
        </Button>
      </CardContent>
    </Card>
  );
}
