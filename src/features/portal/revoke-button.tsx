"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { revokePortalAccount } from "@/features/portal/actions";
import { Button } from "@/components/ui/button";

/** Кнопка отзыва доступа клиента к порталу. */
export function RevokeButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleRevoke() {
    setPending(true);
    const result = await revokePortalAccount(accountId);
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 text-destructive"
      disabled={pending}
      onClick={handleRevoke}
    >
      Revoke
    </Button>
  );
}
