"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { regenerateExportToken } from "@/features/rental-calendar/actions";
import { Button } from "@/components/ui/button";

/**
 * Кнопка ротации токена экспорт-фида iCal. Деактивирует прежний токен и
 * выдаёт новый — на случай утечки URL фида (старый перестаёт работать).
 */
export function RegenerateExportButton({
  propertyId,
}: {
  propertyId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function handle() {
    if (
      !confirm(
        "Regenerate the feed token? The current export URL will stop working immediately.",
      )
    ) {
      return;
    }
    setPending(true);
    setMsg(null);
    const result = await regenerateExportToken(propertyId);
    setPending(false);
    setMsg(result.ok ? "New export URL generated." : result.error);
    if (result.ok) router.refresh();
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={handle}
      >
        {pending ? "Regenerating…" : "Regenerate URL"}
      </Button>
      {msg ? (
        <span className="text-xs text-muted-foreground">{msg}</span>
      ) : null}
    </div>
  );
}
