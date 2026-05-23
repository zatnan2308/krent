"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { startConversation } from "@/features/chat/actions";
import { Button } from "@/components/ui/button";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface NewConversationFormProps {
  portalAccounts: { id: string; label: string }[];
  properties: { id: string; title: string }[];
  basePath: string;
}

/** Форма создания диалога с клиентом (сторона сотрудника). */
export function NewConversationForm({
  portalAccounts,
  properties,
  basePath,
}: NewConversationFormProps) {
  const router = useRouter();
  const [accountId, setAccountId] = React.useState(
    portalAccounts[0]?.id ?? "",
  );
  const [propertyId, setPropertyId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (portalAccounts.length === 0) {
    return (
      <p className="rounded-lg border p-3 text-xs text-muted-foreground">
        Invite a client to a portal first to start a conversation.
      </p>
    );
  }

  async function handleStart() {
    if (!accountId) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await startConversation({
      portalAccountId: accountId,
      propertyId: propertyId || null,
    });
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
      <p className="text-sm font-medium">New conversation</p>
      <select
        className={FIELD_CLASS}
        value={accountId}
        aria-label="Client"
        onChange={(event) => setAccountId(event.target.value)}
      >
        {portalAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.label}
          </option>
        ))}
      </select>
      <select
        className={FIELD_CLASS}
        value={propertyId}
        aria-label="Property"
        onChange={(event) => setPropertyId(event.target.value)}
      >
        <option value="">No property</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.title}
          </option>
        ))}
      </select>
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
        {pending ? "Starting..." : "Start conversation"}
      </Button>
    </div>
  );
}
