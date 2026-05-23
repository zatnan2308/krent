"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setContactConsentAction } from "@/features/campaigns/actions";
import { Button } from "@/components/ui/button";

/** Кнопка переключения согласия контакта на маркетинг. */
export function ConsentToggle({
  contactId,
  subscribed,
  disabled = false,
}: {
  contactId: string;
  subscribed: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState(false);

  async function toggle() {
    setPending(true);
    setError(false);
    const result = await setContactConsentAction(contactId, !subscribed);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending || disabled}
      onClick={toggle}
    >
      {error
        ? "Try again"
        : subscribed
          ? "Unsubscribe"
          : "Resubscribe"}
    </Button>
  );
}
