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

interface NavigationManagerProps {
  header: Tables<"navigation_items">[];
  footer: Tables<"navigation_items">[];
  footerBrowse: Tables<"navigation_items">[];
  footerAreas: Tables<"navigation_items">[];
  footerLegal: Tables<"navigation_items">[];
}

export function NavigationManager({
  header,
  footer,
  footerBrowse,
  footerAreas,
  footerLegal,
}: NavigationManagerProps) {
  return (
    <div className="space-y-10">
      <MenuEditor
        menuKey="header"
        title="Header menu"
        hint="Links shown in the public site header navigation."
        items={header}
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
        />
        <MenuEditor
          menuKey="footer_areas"
          title="Areas column"
          hint="Second footer column — usually neighbourhoods or regions you cover."
          items={footerAreas}
        />
        <MenuEditor
          menuKey="footer"
          title="Company column"
          hint="Third footer column — about, contact and company links."
          items={footer}
        />
        <MenuEditor
          menuKey="footer_legal"
          title="Legal column"
          hint="Fourth footer column — privacy, terms and other legal pages."
          items={footerLegal}
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
}: {
  menuKey: string;
  title: string;
  hint: string;
  items: Tables<"navigation_items">[];
}) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleAdd() {
    setPending(true);
    setError(null);
    const result = await addMenuItem(menuKey, label, url);
    setPending(false);
    if (result.ok) {
      setLabel("");
      setUrl("");
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
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
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
    </div>
  );
}

function NavItemRow({
  item,
  index,
  total,
  pending,
  onMove,
  onDelete,
}: {
  item: Tables<"navigation_items">;
  index: number;
  total: number;
  pending: boolean;
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
    const result = await updateMenuItem(item.id, label, url);
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
        <Input value={url} onChange={(event) => setUrl(event.target.value)} />
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
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.label}</p>
        <p className="truncate text-xs text-muted-foreground">{item.url}</p>
      </div>
      <div className="flex shrink-0 gap-0.5">
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
      </div>
    </li>
  );
}
