"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setLicenseStatus } from "@/features/super-admin/license-actions";
import { Button } from "@/components/ui/button";
import type { Enums } from "@/types/database";

interface Props {
  id: string;
  status: Enums<"license_status">;
}

export function LicenseStatusButtons({ id, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function change(newStatus: Enums<"license_status">) {
    setPending(true);
    await setLicenseStatus(id, newStatus);
    setPending(false);
    router.refresh();
  }

  if (status === "active") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => change("suspended")}
        >
          Suspend
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          disabled={pending}
          onClick={() => change("revoked")}
        >
          Revoke
        </Button>
      </div>
    );
  }
  if (status === "suspended") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => change("active")}
      >
        Re-activate
      </Button>
    );
  }
  return null;
}
