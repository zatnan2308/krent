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
  items: Tables<"navigation_items">[];
}

export function NavigationManager({ items }: NavigationManagerProps) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleAdd() {
    setPending(true);
    setError(null);
    const result = await addMenuItem(label, url);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Header menu items</CardTitle>
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
                    <p className="truncate text-sm font-medium">
                      {item.label}
                    </p>
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
              description="Add links to build the site header menu."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add menu item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="item-label" className="text-sm font-medium">
                Label
              </label>
              <Input
                id="item-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="item-url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="item-url"
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
