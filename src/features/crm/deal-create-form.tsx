"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createDeal } from "@/features/crm/actions";
import type { ContactOption } from "@/features/crm/queries";
import type { DealStage } from "@/features/crm/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface DealCreateFormProps {
  stages: DealStage[];
  contacts: ContactOption[];
}

/** Инлайн-форма ручного создания сделки (контакт + сумма + стадия). */
export function DealCreateForm({ stages, contacts }: DealCreateFormProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const defaultStageId =
    stages.find((stage) => stage.key === "new")?.id ?? stages[0]?.id ?? "";

  const [open, setOpen] = React.useState(false);
  const [contactId, setContactId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [stageId, setStageId] = React.useState(defaultStageId);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setContactId("");
    setTitle("");
    setAmount("");
    setStageId(defaultStageId);
    setError(null);
  }

  function handleContactChange(value: string) {
    setContactId(value);
    // Автозаполнение названия именем контакта, если поле ещё пустое.
    if (title.trim().length === 0) {
      const contact = contacts.find((item) => item.id === value);
      if (contact) setTitle(contact.name);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || contactId === "" || title.trim().length === 0) return;
    const trimmedAmount = amount.trim();
    const amountValue = trimmedAmount === "" ? null : Number(trimmedAmount);
    if (amountValue !== null && (Number.isNaN(amountValue) || amountValue < 0)) {
      setError(t.checkAmount);
      return;
    }
    setPending(true);
    setError(null);
    const result = await createDeal({
      contactId,
      title: title.trim(),
      amount: amountValue,
      stageId: stageId || null,
    });
    setPending(false);
    if (result.ok) {
      reset();
      setOpen(false);
      router.push(`/dashboard/crm/deals/${result.id}`);
    } else {
      setError(result.error);
    }
  }

  if (contacts.length === 0) {
    return (
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {t.dealNoContacts}
      </p>
    );
  }

  if (!open) {
    return (
      <div>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t.newDealBtn}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
    >
      <p className="text-sm font-semibold">{t.newDealTitle}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className={FIELD_CLASS}
          value={contactId}
          required
          aria-label={t.dealContact}
          onChange={(event) => handleContactChange(event.target.value)}
        >
          <option value="" disabled>
            {t.chooseContactPh}
          </option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
              {contact.email ? ` (${contact.email})` : ""}
            </option>
          ))}
        </select>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.titleLabel}
          required
          maxLength={200}
          aria-label={t.titleLabel}
        />
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={t.amount}
          aria-label={t.amount}
        />
        <select
          className={FIELD_CLASS}
          value={stageId}
          aria-label={t.stage}
          onChange={(event) => setStageId(event.target.value)}
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || contactId === "" || title.trim().length === 0}
        >
          {t.createDeal}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
