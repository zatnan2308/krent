"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { inviteToPortal } from "@/features/portal/actions";
import { PORTAL_TYPE_OPTIONS } from "@/features/portal/constants";
import type { PortalType } from "@/features/portal/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface InviteFormProps {
  contacts: { id: string; fullName: string; email: string | null }[];
  properties: { id: string; title: string }[];
}

/** Форма приглашения контакта в клиентский портал. */
export function InviteForm({ contacts, properties }: InviteFormProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashClients;
  const portalLabel = (value: PortalType): string =>
    value === "buyer" ? t.typeBuyer : value === "seller" ? t.typeSeller : t.typeGuest;
  const [contactId, setContactId] = React.useState(contacts[0]?.id ?? "");
  const [portalType, setPortalType] = React.useState<PortalType>("buyer");
  const [propertyId, setPropertyId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  if (contacts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t.addContactFirst}</p>
    );
  }

  async function handleInvite() {
    if (!contactId) {
      setError(t.selectContact);
      return;
    }
    setPending(true);
    setError(null);
    setDone(false);
    const result = await inviteToPortal({
      contactId,
      portalType,
      propertyId:
        portalType === "seller" && propertyId ? propertyId : null,
    });
    setPending(false);
    if (result.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="invite-contact" className="text-sm font-medium">
          {t.fieldContact}
        </label>
        <select
          id="invite-contact"
          className={FIELD_CLASS}
          value={contactId}
          onChange={(event) => setContactId(event.target.value)}
        >
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.fullName}
              {contact.email ? ` (${contact.email})` : t.noEmail}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invite-type" className="text-sm font-medium">
          {t.fieldPortal}
        </label>
        <select
          id="invite-type"
          className={FIELD_CLASS}
          value={portalType}
          onChange={(event) =>
            setPortalType(event.target.value as PortalType)
          }
        >
          {PORTAL_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {portalLabel(option.value)}
            </option>
          ))}
        </select>
      </div>

      {portalType === "seller" ? (
        <div className="space-y-1.5">
          <label htmlFor="invite-property" className="text-sm font-medium">
            {t.fieldProperty}
          </label>
          <select
            id="invite-property"
            className={FIELD_CLASS}
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            <option value="">{t.noProperty}</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t.propertyLinkHint}</p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="text-sm text-emerald-600">{t.inviteCreated}</p>
      ) : null}

      <Button type="button" onClick={handleInvite} disabled={pending}>
        {pending ? t.inviting : t.createInvitation}
      </Button>
    </div>
  );
}
