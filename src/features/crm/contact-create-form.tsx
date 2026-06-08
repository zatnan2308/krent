"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createContact } from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

/** Инлайн-форма ручного создания контакта (org-scoped, дедуп по email). */
export function ContactCreateForm() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || fullName.trim().length === 0) return;
    setPending(true);
    setError(null);
    const result = await createContact({
      fullName: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      reset();
      setOpen(false);
      // Переходим на карточку нового контакта.
      router.push(`/dashboard/crm/contacts/${result.id}`);
    } else {
      setError(result.error);
    }
  }

  if (!open) {
    return (
      <div>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t.newContactBtn}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
    >
      <p className="text-sm font-semibold">{t.newContactTitle}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t.fullName}
          required
          maxLength={200}
          aria-label={t.fullName}
        />
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.contactEmailPh}
          maxLength={200}
          aria-label={t.colEmail}
        />
        <Input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={t.contactPhonePh}
          maxLength={50}
          aria-label={t.colPhone}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || fullName.trim().length === 0}
        >
          {t.createContact}
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
