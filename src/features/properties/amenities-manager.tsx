"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  createAmenity,
  createAmenityCategory,
  deleteAmenity,
  deleteAmenityCategory,
  saveAmenityTranslation,
} from "@/features/properties/amenities-actions";
import type { AmenityCatalog } from "@/features/properties/dashboard-queries";
import type { ActionResult } from "@/features/properties/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface AmenitiesManagerProps {
  catalog: AmenityCatalog;
  canManage: boolean;
  /** Локаль редактирования (default → базовое имя через create; иначе перевод). */
  locale: string;
  /** true — язык по умолчанию (CRUD структуры); иначе режим перевода имён. */
  isDefault: boolean;
  /** Сырые переводы имён категорий по id (для режима перевода). */
  categoryTranslations: Record<string, string>;
  /** Сырые переводы имён удобств по id (для режима перевода). */
  amenityTranslations: Record<string, string>;
}

/** Поле перевода имени удобства/категории на выбранный язык. */
function NameTranslator({
  kind,
  id,
  base,
  initial,
  locale,
}: {
  kind: "amenity" | "amenity_category";
  id: string;
  base: string;
  initial: string;
  locale: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        placeholder={base}
        onChange={(event) => setValue(event.target.value)}
        className="h-8 w-48"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await saveAmenityTranslation(kind, id, value, locale);
          setBusy(false);
          router.refresh();
        }}
      >
        Save
      </Button>
    </div>
  );
}

/** Управление каталогом удобств: системные только для чтения, кастомные — CRUD. */
export function AmenitiesManager({
  catalog,
  canManage,
  locale,
  isDefault,
  categoryTranslations,
  amenityTranslations,
}: AmenitiesManagerProps) {
  const router = useRouter();
  const [categoryName, setCategoryName] = React.useState("");
  const [amenityName, setAmenityName] = React.useState("");
  const [amenityCategoryId, setAmenityCategoryId] = React.useState(
    catalog.categories[0]?.id ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function run(action: () => Promise<ActionResult>): Promise<boolean> {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAddCategory() {
    if (!categoryName.trim()) {
      return;
    }
    const ok = await run(() => createAmenityCategory(categoryName));
    if (ok) {
      setCategoryName("");
    }
  }

  async function handleAddAmenity() {
    if (!amenityName.trim()) {
      return;
    }
    const ok = await run(() => createAmenity(amenityCategoryId, amenityName));
    if (ok) {
      setAmenityName("");
    }
  }

  const uncategorized = catalog.amenities.filter(
    (amenity) =>
      amenity.category_id === null ||
      !catalog.categories.some((c) => c.id === amenity.category_id),
  );

  /** Строка удобства: имя + перевод (в режиме перевода) или удаление. */
  const amenityRow = (amenity: { id: string; name: string; organization_id: string | null }) => {
    const amenityIsSystem = amenity.organization_id === null;
    return (
      <li
        key={amenity.id}
        className="flex items-center justify-between gap-3 py-2"
      >
        <span className="text-sm">{amenity.name}</span>
        {!isDefault ? (
          <NameTranslator
            kind="amenity"
            id={amenity.id}
            base={amenity.name}
            initial={amenityTranslations[amenity.id] ?? ""}
            locale={locale}
          />
        ) : canManage && !amenityIsSystem ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            disabled={pending}
            aria-label="Delete amenity"
            onClick={() => void run(() => deleteAmenity(amenity.id))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {catalog.categories.map((category) => {
        const items = catalog.amenities.filter(
          (amenity) => amenity.category_id === category.id,
        );
        const isSystem = category.organization_id === null;
        return (
          <Card key={category.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {category.name}
                {isSystem ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    System
                  </span>
                ) : null}
              </CardTitle>
              {!isDefault ? (
                <NameTranslator
                  kind="amenity_category"
                  id={category.id}
                  base={category.name}
                  initial={categoryTranslations[category.id] ?? ""}
                  locale={locale}
                />
              ) : canManage && !isSystem ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  disabled={pending}
                  aria-label="Delete category"
                  onClick={() =>
                    void run(() => deleteAmenityCategory(category.id))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {items.length > 0 ? (
                <ul className="divide-y">{items.map(amenityRow)}</ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No amenities in this category.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {uncategorized.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uncategorized</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">{uncategorized.map(amenityRow)}</ul>
          </CardContent>
        </Card>
      ) : null}

      {catalog.categories.length === 0 ? (
        <EmptyState
          title="No amenity categories"
          description="System categories load with the platform. Add custom ones below."
        />
      ) : null}

      {canManage && isDefault ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="category-name" className="text-sm font-medium">
                  Category name
                </label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddCategory}
                disabled={pending}
              >
                Add category
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add amenity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="amenity-category"
                  className="text-sm font-medium"
                >
                  Category
                </label>
                <select
                  id="amenity-category"
                  className={FIELD_CLASS}
                  value={amenityCategoryId}
                  onChange={(event) =>
                    setAmenityCategoryId(event.target.value)
                  }
                >
                  {catalog.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="amenity-name" className="text-sm font-medium">
                  Amenity name
                </label>
                <Input
                  id="amenity-name"
                  value={amenityName}
                  onChange={(event) => setAmenityName(event.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddAmenity}
                disabled={pending}
              >
                Add amenity
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
