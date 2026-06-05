"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateContact } from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ContactEditFormProps {
  contact: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    language: string | null;
    currency: string | null;
  };
  canManage: boolean;
}

/** Редактирование данных контакта (для crm.manage); иначе read-only. */
export function ContactEditForm({ contact, canManage }: ContactEditFormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    fullName: contact.fullName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    language: contact.language ?? "",
    currency: contact.currency ?? "",
  });
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  if (!canManage) {
    return (
      <dl className="space-y-1 text-sm">
        <Row label="Email" value={contact.email} />
        <Row label="Phone" value={contact.phone} />
        <Row label="Language" value={contact.language} />
        <Row label="Currency" value={contact.currency} />
      </dl>
    );
  }

  async function handleSave() {
    setPending(true);
    setMsg(null);
    const result = await updateContact({
      contactId: contact.id,
      fullName: form.fullName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      preferredLanguage: form.language.trim() || null,
      preferredCurrency: form.currency.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      setMsg("Saved.");
      router.refresh();
    } else {
      setMsg(result.error);
    }
  }

  return (
    <div className="space-y-2.5">
      <Field label="Full name">
        <Input
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <Input
          value={form.email}
          placeholder="—"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <Input
          value={form.phone}
          placeholder="—"
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Language">
          <Input
            value={form.language}
            placeholder="—"
            onChange={(e) => setForm({ ...form, language: e.target.value })}
          />
        </Field>
        <Field label="Currency">
          <Input
            value={form.currency}
            placeholder="—"
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" type="button" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {msg ? (
          <span className="text-xs text-muted-foreground">{msg}</span>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
