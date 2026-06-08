"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  deleteContact,
  deleteDeal,
  deleteLead,
} from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

type CrmEntity = "contact" | "lead" | "deal";

/** Кнопка удаления CRM-сущности с подтверждением (manager-only на сервере). */
export function CrmDeleteButton({
  entity,
  id,
}: {
  entity: CrmEntity;
  id: string;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const label =
    entity === "contact"
      ? t.deleteContactBtn
      : entity === "lead"
        ? t.deleteLeadBtn
        : t.deleteDealBtn;
  const confirmText =
    entity === "contact"
      ? t.deleteContactConfirm
      : entity === "lead"
        ? t.deleteLeadConfirm
        : t.deleteDealConfirm;
  const redirectTo =
    entity === "contact"
      ? "/dashboard/crm/contacts"
      : entity === "lead"
        ? "/dashboard/crm/leads"
        : "/dashboard/crm/deals";

  async function handleDelete() {
    if (pending) return;
    if (!window.confirm(confirmText)) return;
    setPending(true);
    setError(null);
    const result =
      entity === "contact"
        ? await deleteContact(id)
        : entity === "lead"
          ? await deleteLead(id)
          : await deleteDeal(id);
    if (result.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setPending(false);
      setError(result.error);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={handleDelete}
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {label}
      </Button>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
