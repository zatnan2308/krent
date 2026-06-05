"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setOrganizationStatus } from "@/features/super-admin/organization-actions";
import { Button } from "@/components/ui/button";
import type { Enums } from "@/types/database";

interface Props {
  id: string;
  status: Enums<"organization_status">;
}

/** Super-admin переключатель статуса организации: suspend / re-activate. */
export function OrganizationStatusButtons({ id, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function change(newStatus: Enums<"organization_status">) {
    setPending(true);
    setError(null);
    const result = await setOrganizationStatus(id, newStatus);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "active" ? (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          disabled={pending}
          onClick={() => change("suspended")}
        >
          Suspend
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => change("active")}
        >
          Re-activate
        </Button>
      )}
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
