"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { inviteToPortal } from "@/features/portal/actions";
import { PORTAL_TYPE_OPTIONS } from "@/features/portal/constants";
import type { PortalType } from "@/features/portal/types";
import { Button } from "@/components/ui/button";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface InviteFormProps {
  contacts: { id: string; fullName: string; email: string | null }[];
  properties: { id: string; title: string }[];
}

/** Форма приглашения контакта в клиентский портал. */
export function InviteForm({ contacts, properties }: InviteFormProps) {
  const router = useRouter();
  const [contactId, setContactId] = React.useState(contacts[0]?.id ?? "");
  const [portalType, setPortalType] = React.useState<PortalType>("buyer");
  const [propertyId, setPropertyId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  if (contacts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a contact in the CRM first, then invite them to a portal.
      </p>
    );
  }

  async function handleInvite() {
    if (!contactId) {
      setError("Select a contact.");
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
          Contact
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
              {contact.email ? ` (${contact.email})` : " — no email"}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invite-type" className="text-sm font-medium">
          Portal
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
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {portalType === "seller" ? (
        <div className="space-y-1.5">
          <label htmlFor="invite-property" className="text-sm font-medium">
            Property (optional)
          </label>
          <select
            id="invite-property"
            className={FIELD_CLASS}
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            <option value="">No property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            The selected property will be linked to this seller.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="text-sm text-emerald-600">
          Invitation created. The link is shown in the list above.
        </p>
      ) : null}

      <Button type="button" onClick={handleInvite} disabled={pending}>
        {pending ? "Inviting..." : "Create invitation"}
      </Button>
    </div>
  );
}
