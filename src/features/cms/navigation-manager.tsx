"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { addMenuItem, deleteMenuItem } from "@/features/cms/navigation-actions";
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
}

export function NavigationManager({ header, footer }: NavigationManagerProps) {
  return (
    <div className="space-y-8">
      <MenuEditor
        menuKey="header"
        title="Header menu"
        hint="Links shown in the public site header navigation."
        items={header}
      />
      <MenuEditor
        menuKey="footer"
        title="Footer menu"
        hint="Extra links column (“Company”) in the public site footer. Leave empty to use defaults."
        items={footer}
      />
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
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.url}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleDelete(item.id)}
                    disabled={pending}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
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
