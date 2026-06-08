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
import { useI18n } from "@/lib/i18n/provider";
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
  const { dict } = useI18n();
  const t = dict.dashNavigation;
  // Родители для дропдаунов — верхнеуровневые пункты хедера.
  const parentOptions = header
    .filter((item) => !item.parent_id)
    .map((item) => ({ id: item.id, label: item.label }));
  return (
    <div className="space-y-10">
      <MenuEditor
        menuKey="header"
        title={t.headerMenu}
        hint={t.headerHint}
        items={header}
        parentOptions={parentOptions}
        pageOptions={pages}
        locale={locale}
        isDefault={isDefault}
      />

      <div className="space-y-6">
        <div className="border-t pt-6">
          <h2 className="text-base font-semibold">{t.footerColumns}</h2>
          <p className="text-xs text-muted-foreground">{t.footerColumnsHint}</p>
        </div>
        <MenuEditor
          menuKey="footer_browse"
          title={t.browseColumn}
          hint={t.browseHint}
          items={footerBrowse}
          locale={locale}
          isDefault={isDefault}
        />
        <MenuEditor
          menuKey="footer_areas"
          title={t.areasColumn}
          hint={t.areasHint}
          items={footerAreas}
          locale={locale}
          isDefault={isDefault}
        />
        <MenuEditor
          menuKey="footer"
          title={t.companyColumn}
          hint={t.companyHint}
          items={footer}
          locale={locale}
          isDefault={isDefault}
        />
        <MenuEditor
          menuKey="footer_legal"
          title={t.legalColumn}
          hint={t.legalHint}
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
  const { dict } = useI18n();
  const tn = dict.dashNavigation;
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
          <CardTitle className="text-sm">{tn.items}</CardTitle>
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
            <EmptyState title={tn.noItems} description={tn.noItemsDesc} />
          )}
        </CardContent>
      </Card>

      {isDefault ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{tn.addItem}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor={`${menuKey}-label`}
                className="text-sm font-medium"
              >
                {tn.label}
              </label>
              <Input
                id={`${menuKey}-label`}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${menuKey}-url`} className="text-sm font-medium">
                {tn.url}
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
                  {tn.linkToPage}
                </label>
                <select
                  id={`${menuKey}-page`}
                  value={pageId}
                  onChange={(event) => setPageId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{tn.useUrlAbove}</option>
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
                  {tn.parentDropdowns}
                </label>
                <select
                  id={`${menuKey}-parent`}
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{tn.topLevel}</option>
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
            {pending ? tn.saving : tn.addItem}
          </Button>
        </CardContent>
      </Card>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          {tn.structureNote}
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
  const { dict } = useI18n();
  const tn = dict.dashNavigation;
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
            {tn.save}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(false)}
          >
            {tn.cancel}
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
              aria-label={tn.moveUp}
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
              aria-label={tn.moveDown}
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
          aria-label={tn.editItem}
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
            aria-label={tn.removeItem}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
