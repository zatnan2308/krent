"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { startConversationWithAgent } from "@/features/chat/actions";
import { Button } from "@/components/ui/button";

interface ClientStartConversationProps {
  basePath: string;
  propertyId?: string | null;
  label?: string;
}

/**
 * Кнопка инициации диалога со стороны клиента (портал/кабинет). Создаёт или
 * переиспользует диалог с агентом и открывает его.
 */
export function ClientStartConversation({
  basePath,
  propertyId = null,
  label,
}: ClientStartConversationProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleStart() {
    setPending(true);
    setError(null);
    const result = await startConversationWithAgent({ propertyId });
    setPending(false);
    if (result.ok) {
      router.push(`${basePath}?c=${result.conversationId}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Need help?</p>
      <p className="text-xs text-muted-foreground">
        Start a conversation with your agent.
      </p>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={handleStart}
      >
        {pending ? "Starting..." : (label ?? "Message your agent")}
      </Button>
    </div>
  );
}
