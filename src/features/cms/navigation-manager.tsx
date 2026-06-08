"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  addMenuItem,
  deleteMenuItem,
  moveMenuItem,
  updateMenuItem,
} from "@/features/cms/navigation-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/types/database";

interface NavOption {
  id: string;
  label: string;
}

interface NavigationManagerProps {
  header: Tables<"navigation_items">[];
  footer: Tables<"navigation_items">[];
  footerBrowse: Tables<"navigation_items">[];
  footerAreas: Tables<"navigation_items">[];
  footerLegal: Tables<"navigation_items">[];
  /** Опубликованные страницы для привязки пункта (page_id). */
  pages: NavOption[];
  /** Локаль редактирования label (default → база, иначе → перевод). */
  locale: string;
  /** true — язык по умолчанию (полная структура: add/move/delete). */
  isDefault: boolean;
}

export function NavigationManager({
  header,
  footer,
  footerBrowse,
  footerAreas,
  footerLegal,
  pages,
  locale,
  isDefault,
}: NavigationManagerProps) {
  // Родители для дропдаунов — верхнеуровневые пункты хедера.
  const parentOptions = header
    .filter((item) => !item.parent_id)
    .map((item) => ({ id: item.id, label: item.label }));
  return (
    <div className="space-y-10">
      <MenuEditor
        menuKey="header"
        title="Header menu"
        hint="Links in the public header. Pick a parent to nest an item as a dropdown, or link it to a page."
        items={header}
        parentOptions={parentOptions}
        pageOptions={pages}
        locale={locale}
        isDefault={isDefault}
      />

      <div className="space-y-6">
        <div className="border-t pt-6">
          <h2 className="text-base font-semibold">Footer columns</h2>
          <p className="text-xs text-muted-foreground">
            Each column of the public site footer. Leave a column empty to fall
            back to the built-in defaults.
          </p>
        </div>
        <MenuEditor
          menuKey="footer_browse"
          title="Browse column"
          hint="First footer column — usually listing shortcuts (buy, rent…)."
          items={footerBrowse}
          locale={locale}
          isDefault={isDefault}
        />
        <MenuEditor
          menuKey="footer_areas"
          title="Areas column"
          hint="Second footer column — usually neighbourhoods or regions you cover."
          items={footerAreas}
          locale={locale}
          isDefault={isDefault}
        />
        <MenuEditor
          menuKey="footer"
          title="Company column"
          hint="Third footer column — about, contact and company links."
          items={footer}
          locale={locale}
          isDefault={isDefault}
        />
        <MenuEditor
          menuKey="footer_legal"
          title="Legal column"
          hint="Fourth footer column — privacy, terms and other legal pages."
          items={footerLegal}
          locale={locale}
          isDefault={isDefault}
        />
      </div>
    </div>
  );
}

function MenuEditor({
  menuKey,
  title,
  hint,
  items,
  parentOptions,
  pageOptions,
  locale,
  isDefault,
}: {
  menuKey: string;
  title: string;
  hint: string;
  items: Tables<"navigation_items">[];
  parentOptions?: { id: string; label: string }[];
  pageOptions?: { id: string; label: string }[];
  locale: string;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [pageId, setPageId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleAdd() {
    setPending(true);
    setError(null);
    const result = await addMenuItem(
      menuKey,
      label,
      url,
      parentId || null,
      pageId || null,
    );
    setPending(false);
    if (result.ok) {
      setLabel("");
      setUrl("");
      setParentId("");
      setPageId("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(itemId: string) {
    setPending(true);
    await deleteMenuItem(itemId);
    setPending(false);
    router.refresh();
  }

  async function handleMove(itemId: string, direction: "up" | "down") {
    setPending(true);
    await moveMenuItem(itemId, direction);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <ul className="divide-y">
              {items.map((item, index) => (
                <NavItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  total={items.length}
                  pending={pending}
                  locale={locale}
                  isDefault={isDefault}
                  onMove={handleMove}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No menu items"
              description="Add links to build this menu."
            />
          )}
        </CardContent>
      </Card>

      {isDefault ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Add item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor={`${menuKey}-label`}
                className="text-sm font-medium"
              >
                Label
              </label>
              <Input
                id={`${menuKey}-label`}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${menuKey}-url`} className="text-sm font-medium">
                URL
              </label>
              <Input
                id={`${menuKey}-url`}
                value={url}
                placeholder="/about"
                disabled={pageId !== ""}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
            {pageOptions ? (
              <div className="space-y-2">
                <label
                  htmlFor={`${menuKey}-page`}
                  className="text-sm font-medium"
                >
                  Link to page
                </label>
                <select
                  id={`${menuKey}-page`}
                  value={pageId}
                  onChange={(event) => setPageId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Use URL above —</option>
                  {pageOptions.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {parentOptions ? (
              <div className="space-y-2">
                <label
                  htmlFor={`${menuKey}-parent`}
                  className="text-sm font-medium"
                >
                  Parent (for dropdowns)
                </label>
                <select
                  id={`${menuKey}-parent`}
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Top level —</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" onClick={handleAdd} disabled={pending}>
            {pending ? "Saving..." : "Add item"}
          </Button>
        </CardContent>
      </Card>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Menu structure (adding, removing, reordering) is managed in the
          default language. Here you translate the labels above.
        </p>
      )}
    </div>
  );
}

function NavItemRow({
  item,
  index,
  total,
  pending,
  locale,
  isDefault,
  onMove,
  onDelete,
}: {
  item: Tables<"navigation_items">;
  index: number;
  total: number;
  pending: boolean;
  locale: string;
  isDefault: boolean;
  onMove: (itemId: string, direction: "up" | "down") => void;
  onDelete: (itemId: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState(item.label ?? "");
  const [url, setUrl] = React.useState(item.url ?? "");
  const [busy, setBusy] = React.useState(false);

  async function save() {
    setBusy(true);
    const result = await updateMenuItem(item.id, label, url, locale);
    setBusy(false);
    if (result.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  if (editing) {
    return (
      <li className="space-y-2 py-2">
        <Input value={label} onChange={(event) => setLabel(event.target.value)} />
        {isDefault ? (
          <Input value={url} onChange={(event) => setUrl(event.target.value)} />
        ) : null}
        <div className="flex gap-1">
          <Button type="button" size="sm" onClick={save} disabled={busy}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className={`min-w-0 ${item.parent_id ? "pl-5" : ""}`}>
        <p className="truncate text-sm font-medium">
          {item.parent_id ? (
            <span className="text-muted-foreground">&#8627; </span>
          ) : null}
          {item.label}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.url ?? (item.page_id ? "Linked page" : "—")}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        {isDefault ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pending || index === 0}
              aria-label="Move up"
              onClick={() => onMove(item.id, "up")}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pending || index === total - 1}
              aria-label="Move down"
              onClick={() => onMove(item.id, "down")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Edit item"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {isDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(item.id)}
            disabled={pending}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
