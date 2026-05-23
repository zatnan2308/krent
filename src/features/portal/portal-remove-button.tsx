"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  removeFavoriteProperty,
  removeSavedSearch,
} from "@/features/portal/actions";
import { Button } from "@/components/ui/button";

interface PortalRemoveButtonProps {
  kind: "favorite" | "search";
  id: string;
}

/** Кнопка удаления элемента портала покупателя (избранное / поиск). */
export function PortalRemoveButton({ kind, id }: PortalRemoveButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleRemove() {
    setPending(true);
    const result =
      kind === "favorite"
        ? await removeFavoriteProperty(id)
        : await removeSavedSearch(id);
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-destructive"
      disabled={pending}
      aria-label="Remove"
      onClick={handleRemove}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
