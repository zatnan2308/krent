"use client";

import * as React from "react";

import { acceptPortalInvite } from "@/features/portal/actions";
import { Button } from "@/components/ui/button";

interface AcceptButtonProps {
  token: string;
}

/** Кнопка принятия приглашения. При успехе action делает редирект в портал. */
export function AcceptButton({ token }: AcceptButtonProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAccept() {
    setPending(true);
    setError(null);
    const result = await acceptPortalInvite(token);
    // Успешный путь делает redirect внутри action — сюда попадаем при ошибке.
    if (result && !result.ok) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" disabled={pending} onClick={handleAccept}>
        {pending ? "Accepting..." : "Accept invitation"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
