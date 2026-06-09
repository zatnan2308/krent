"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  createContactRelationship,
  deleteContactRelationship,
} from "@/features/crm/actions";
import type { ContactRelationshipItem } from "@/features/crm/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const REL_TYPES = [
  "spouse",
  "partner",
  "co_buyer",
  "co_borrower",
  "family",
  "assistant",
  "other",
] as const;

type RelType = (typeof REL_TYPES)[number];

interface ContactRelationshipsProps {
  contactId: string;
  items: ContactRelationshipItem[];
  contactOptions: { id: string; name: string }[];
  canManage: boolean;
}

/** Связанные лица контакта: список + добавление/удаление. */
export function ContactRelationships({
  contactId,
  items,
  contactOptions,
  canManage,
}: ContactRelationshipsProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [relatedContactId, setRelatedContactId] = React.useState("");
  const [relatedName, setRelatedName] = React.useState("");
  const [relType, setRelType] = React.useState<RelType>("spouse");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const typeLabels: Record<RelType, string> = {
    spouse: t.relTypeSpouse,
    partner: t.relTypePartner,
    co_buyer: t.relTypeCoBuyer,
    co_borrower: t.relTypeCoBorrower,
    family: t.relTypeFamily,
    assistant: t.relTypeAssistant,
    other: t.relTypeOther,
  };

  async function add() {
    if (pending) return;
    if (relatedContactId === "" && relatedName.trim() === "") {
      setError(t.relNeedValue);
      return;
    }
    setPending(true);
    setError(null);
    const result = await createContactRelationship({
      contactId,
      relatedContactId: relatedContactId || null,
      relatedName: relatedName.trim() || null,
      relationshipType: relType,
    });
    setPending(false);
    if (result.ok) {
      setRelatedContactId("");
      setRelatedName("");
      setRelType("spouse");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function remove(id: string) {
    setPending(true);
    const result = await deleteContactRelationship(id);
    setPending(false);
    if (result.ok) router.refresh();
    else setError(result.error);
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="divide-y">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {typeLabels[item.relationshipType as RelType] ??
                    item.relationshipType}
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => void remove(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  {t.relRemove}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.relEmpty}</p>
      )}

      {canManage ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              className={FIELD_CLASS}
              value={relType}
              aria-label={t.relType}
              onChange={(e) => setRelType(e.target.value as RelType)}
            >
              {REL_TYPES.map((value) => (
                <option key={value} value={value}>
                  {typeLabels[value]}
                </option>
              ))}
            </select>
            <select
              className={FIELD_CLASS}
              value={relatedContactId}
              aria-label={t.relLinkedContact}
              onChange={(e) => setRelatedContactId(e.target.value)}
            >
              <option value="">{t.relLinkedContact}</option>
              {contactOptions
                .filter((option) => option.id !== contactId)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
            </select>
            <Input
              className="h-9 text-xs"
              value={relatedName}
              placeholder={t.relName}
              onChange={(e) => setRelatedName(e.target.value)}
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="button" size="sm" disabled={pending} onClick={() => void add()}>
            {t.relAdd}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
