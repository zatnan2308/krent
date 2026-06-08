"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { inviteToPortal, revokePortalAccount } from "@/features/portal/actions";
import type { PortalType } from "@/features/portal/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

const PORTAL_TYPES: PortalType[] = ["buyer", "seller", "guest"];

interface AccountRow {
  id: string;
  portalType: string;
  status: string;
}

interface ContactPortalAccessProps {
  contactId: string;
  accounts: AccountRow[];
  canManage: boolean;
}

/** Управление доступом контакта к клиентскому порталу с карточки контакта. */
export function ContactPortalAccess({
  contactId,
  accounts,
  canManage,
}: ContactPortalAccessProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const portalLabels: Record<PortalType, string> = {
    buyer: t.portalBuyer,
    seller: t.portalSeller,
    guest: t.portalGuest,
  };
  const [type, setType] = React.useState<PortalType>("buyer");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function invite() {
    setPending(true);
    setMsg(null);
    const result = await inviteToPortal({
      contactId,
      portalType: type,
      propertyId: null,
    });
    setPending(false);
    setMsg(result.ok ? t.invitationSent : result.error);
    if (result.ok) router.refresh();
  }

  async function revoke(accountId: string) {
    setPending(true);
    setMsg(null);
    const result = await revokePortalAccount(accountId);
    setPending(false);
    if (!result.ok) setMsg(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {accounts.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2"
            >
              <span className="capitalize">
                {account.portalType} · {account.status}
              </span>
              {canManage && account.status !== "revoked" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => revoke(account.id)}
                >
                  {t.revoke}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noPortalAccess}</p>
      )}

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            aria-label={t.portalTypeAria}
            onChange={(event) => setType(event.target.value as PortalType)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PORTAL_TYPES.map((value) => (
              <option key={value} value={value}>
                {portalLabels[value]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={invite}
          >
            {t.inviteToPortal}
          </Button>
          {msg ? (
            <span className="text-xs text-muted-foreground">{msg}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
