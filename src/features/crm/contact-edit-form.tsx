"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateContact } from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface ContactIdentity {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  language: string | null;
  currency: string | null;
  contactKind: string;
  companyName: string | null;
  jobTitle: string | null;
  secondaryPhone: string | null;
  secondaryEmail: string | null;
  preferredChannel: string | null;
  bestTimeToContact: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  dateOfBirth: string | null;
  referredByContactId: string | null;
  referralNote: string | null;
}

interface ContactEditFormProps {
  contact: ContactIdentity;
  contactOptions: { id: string; name: string }[];
  canManage: boolean;
}

/** Редактирование данных контакта (для crm.manage); иначе read-only. */
export function ContactEditForm({
  contact,
  contactOptions,
  canManage,
}: ContactEditFormProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [form, setForm] = React.useState({
    fullName: contact.fullName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    language: contact.language ?? "",
    currency: contact.currency ?? "",
    contactKind: contact.contactKind || "person",
    companyName: contact.companyName ?? "",
    jobTitle: contact.jobTitle ?? "",
    secondaryPhone: contact.secondaryPhone ?? "",
    secondaryEmail: contact.secondaryEmail ?? "",
    preferredChannel: contact.preferredChannel ?? "",
    bestTimeToContact: contact.bestTimeToContact ?? "",
    addressLine: contact.addressLine ?? "",
    city: contact.city ?? "",
    postalCode: contact.postalCode ?? "",
    country: contact.country ?? "",
    dateOfBirth: contact.dateOfBirth ?? "",
    referredByContactId: contact.referredByContactId ?? "",
    referralNote: contact.referralNote ?? "",
  });
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (!canManage) {
    return (
      <dl className="space-y-1 text-sm">
        <Row label={t.colEmail} value={contact.email} />
        <Row label={t.colPhone} value={contact.phone} />
        {contact.companyName ? (
          <Row label={t.companyName} value={contact.companyName} />
        ) : null}
        {contact.city || contact.country ? (
          <Row
            label={t.cityLabel}
            value={[contact.city, contact.country].filter(Boolean).join(", ")}
          />
        ) : null}
        <Row label={t.language} value={contact.language} />
        <Row label={t.currency} value={contact.currency} />
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
      contactKind: form.contactKind === "company" ? "company" : "person",
      companyName: form.companyName.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      secondaryPhone: form.secondaryPhone.trim() || null,
      secondaryEmail: form.secondaryEmail.trim() || null,
      preferredChannel: form.preferredChannel || null,
      bestTimeToContact: form.bestTimeToContact || null,
      addressLine: form.addressLine.trim() || null,
      city: form.city.trim() || null,
      postalCode: form.postalCode.trim() || null,
      country: form.country.trim() || null,
      dateOfBirth: form.dateOfBirth || null,
      referredByContactId: form.referredByContactId || null,
      referralNote: form.referralNote.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      setMsg(t.saved);
      router.refresh();
    } else {
      setMsg(result.error);
    }
  }

  return (
    <div className="space-y-2.5">
      <Field label={t.fullName}>
        <Input
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t.contactKindLabel}>
          <select
            className={FIELD_CLASS}
            value={form.contactKind}
            onChange={(e) => set("contactKind", e.target.value)}
          >
            <option value="person">{t.kindPerson}</option>
            <option value="company">{t.kindCompany}</option>
          </select>
        </Field>
        <Field label={t.jobTitle}>
          <Input
            value={form.jobTitle}
            placeholder="—"
            onChange={(e) => set("jobTitle", e.target.value)}
          />
        </Field>
      </div>
      {form.contactKind === "company" ? (
        <Field label={t.companyName}>
          <Input
            value={form.companyName}
            placeholder="—"
            onChange={(e) => set("companyName", e.target.value)}
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Field label={t.colEmail}>
          <Input
            value={form.email}
            placeholder="—"
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label={t.colPhone}>
          <Input
            value={form.phone}
            placeholder="—"
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label={t.secondaryEmail}>
          <Input
            value={form.secondaryEmail}
            placeholder="—"
            onChange={(e) => set("secondaryEmail", e.target.value)}
          />
        </Field>
        <Field label={t.secondaryPhone}>
          <Input
            value={form.secondaryPhone}
            placeholder="—"
            onChange={(e) => set("secondaryPhone", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label={t.preferredChannel}>
          <select
            className={FIELD_CLASS}
            value={form.preferredChannel}
            onChange={(e) => set("preferredChannel", e.target.value)}
          >
            <option value="">{t.channelAny}</option>
            <option value="phone">{t.channelPhone}</option>
            <option value="sms">{t.channelSms}</option>
            <option value="email">{t.channelEmail}</option>
            <option value="whatsapp">{t.channelWhatsapp}</option>
            <option value="telegram">{t.channelTelegram}</option>
          </select>
        </Field>
        <Field label={t.bestTime}>
          <select
            className={FIELD_CLASS}
            value={form.bestTimeToContact}
            onChange={(e) => set("bestTimeToContact", e.target.value)}
          >
            <option value="">{t.timeAny}</option>
            <option value="morning">{t.timeMorning}</option>
            <option value="afternoon">{t.timeAfternoon}</option>
            <option value="evening">{t.timeEvening}</option>
          </select>
        </Field>
      </div>

      <Field label={t.addressLine}>
        <Input
          value={form.addressLine}
          placeholder="—"
          onChange={(e) => set("addressLine", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t.cityLabel}>
          <Input
            value={form.city}
            placeholder="—"
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
        <Field label={t.postalCode}>
          <Input
            value={form.postalCode}
            placeholder="—"
            onChange={(e) => set("postalCode", e.target.value)}
          />
        </Field>
        <Field label={t.countryLabel}>
          <Input
            value={form.country}
            placeholder="—"
            onChange={(e) => set("country", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label={t.dateOfBirth}>
          <Input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set("dateOfBirth", e.target.value)}
          />
        </Field>
        <Field label={t.language}>
          <Input
            value={form.language}
            placeholder="—"
            onChange={(e) => set("language", e.target.value)}
          />
        </Field>
        <Field label={t.currency}>
          <Input
            value={form.currency}
            placeholder="—"
            onChange={(e) => set("currency", e.target.value)}
          />
        </Field>
        <Field label={t.referredBy}>
          <select
            className={FIELD_CLASS}
            value={form.referredByContactId}
            onChange={(e) => set("referredByContactId", e.target.value)}
          >
            <option value="">{t.noReferrer}</option>
            {contactOptions
              .filter((option) => option.id !== contact.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <Field label={t.referralNote}>
        <Input
          value={form.referralNote}
          placeholder="—"
          onChange={(e) => set("referralNote", e.target.value)}
        />
      </Field>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" type="button" onClick={handleSave} disabled={pending}>
          {pending ? t.saving : t.save}
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
