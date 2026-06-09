"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateContactConsents } from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

export interface ContactConsents {
  id: string;
  consentCall: boolean;
  consentSms: boolean;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  consentMarketing: boolean;
  doNotContact: boolean;
  consentSource: string | null;
  consentAt: string | null;
}

/** Согласия контакта на связь (блок F). */
export function ContactConsentsForm({
  contact,
  canManage,
}: {
  contact: ContactConsents;
  canManage: boolean;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [call, setCall] = React.useState(contact.consentCall);
  const [sms, setSms] = React.useState(contact.consentSms);
  const [email, setEmail] = React.useState(contact.consentEmail);
  const [whatsapp, setWhatsapp] = React.useState(contact.consentWhatsapp);
  const [marketing, setMarketing] = React.useState(contact.consentMarketing);
  const [doNotContact, setDoNotContact] = React.useState(contact.doNotContact);
  const [source, setSource] = React.useState(contact.consentSource ?? "");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setMsg(null);
    const result = await updateContactConsents({
      contactId: contact.id,
      consentCall: call,
      consentSms: sms,
      consentEmail: email,
      consentWhatsapp: whatsapp,
      consentMarketing: marketing,
      doNotContact,
      consentSource: source.trim() || null,
    });
    setPending(false);
    setMsg(result.ok ? t.saved : result.error);
    if (result.ok) router.refresh();
  }

  const Check = ({
    label,
    checked,
    onChange,
    danger = false,
  }: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    danger?: boolean;
  }) => (
    <label
      className={`flex items-center gap-2 text-sm ${danger ? "text-destructive" : ""}`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input"
        checked={checked}
        disabled={!canManage}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1.5">
        <Check label={t.consentCall} checked={call} onChange={setCall} />
        <Check label={t.consentSms} checked={sms} onChange={setSms} />
        <Check label={t.consentEmail} checked={email} onChange={setEmail} />
        <Check
          label={t.consentWhatsapp}
          checked={whatsapp}
          onChange={setWhatsapp}
        />
        <Check
          label={t.consentMarketing}
          checked={marketing}
          onChange={setMarketing}
        />
        <Check
          label={t.doNotContact}
          checked={doNotContact}
          onChange={setDoNotContact}
          danger
        />
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t.consentSource}
        </span>
        <Input
          value={source}
          placeholder="—"
          disabled={!canManage}
          onChange={(e) => setSource(e.target.value)}
        />
      </label>
      {contact.consentAt ? (
        <p className="text-xs text-muted-foreground">
          {t.consentAtLabel}: {new Date(contact.consentAt).toLocaleString("en-US")}
        </p>
      ) : null}
      {canManage ? (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            type="button"
            onClick={handleSave}
            disabled={pending}
          >
            {pending ? t.saving : t.save}
          </Button>
          {msg ? (
            <span className="text-xs text-muted-foreground">{msg}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
