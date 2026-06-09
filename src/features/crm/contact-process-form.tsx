"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateContactProcess } from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** datetime-local (локальная зона браузера) → абсолютный ISO (или null). */
function localToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO (UTC) → значение для datetime-local (локальная зона). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export interface ContactProcess {
  id: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  verificationStatus: string;
  isVip: boolean;
  internalNotes: string | null;
}

/** Служебные поля контакта (блок G): касания, верификация, VIP, заметки. */
export function ContactProcessForm({
  contact,
  canManage,
}: {
  contact: ContactProcess;
  canManage: boolean;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [lastContactedAt, setLastContactedAt] = React.useState(
    toLocalInput(contact.lastContactedAt),
  );
  const [nextFollowUpAt, setNextFollowUpAt] = React.useState(
    toLocalInput(contact.nextFollowUpAt),
  );
  const [verificationStatus, setVerificationStatus] = React.useState(
    contact.verificationStatus || "none",
  );
  const [isVip, setIsVip] = React.useState(contact.isVip);
  const [internalNotes, setInternalNotes] = React.useState(
    contact.internalNotes ?? "",
  );
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setMsg(null);
    const result = await updateContactProcess({
      contactId: contact.id,
      lastContactedAt: localToIso(lastContactedAt),
      nextFollowUpAt: localToIso(nextFollowUpAt),
      verificationStatus: verificationStatus as
        | "none"
        | "pending"
        | "verified",
      isVip,
      internalNotes: internalNotes.trim() || null,
    });
    setPending(false);
    setMsg(result.ok ? t.saved : result.error);
    if (result.ok) router.refresh();
  }

  if (!canManage) {
    return (
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t.nextFollowUpAt}</dt>
          <dd>
            {contact.nextFollowUpAt
              ? new Date(contact.nextFollowUpAt).toLocaleString("en-US")
              : "—"}
          </dd>
        </div>
        {contact.isVip ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            VIP
          </span>
        ) : null}
      </dl>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t.lastContactedAt}
          </span>
          <Input
            type="datetime-local"
            value={lastContactedAt}
            onChange={(e) => setLastContactedAt(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t.nextFollowUpAt}
          </span>
          <Input
            type="datetime-local"
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t.verificationStatus}
        </span>
        <select
          className={FIELD_CLASS}
          value={verificationStatus}
          onChange={(e) => setVerificationStatus(e.target.value)}
        >
          <option value="none">{t.verNone}</option>
          <option value="pending">{t.verPending}</option>
          <option value="verified">{t.verVerified}</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={isVip}
          onChange={(e) => setIsVip(e.target.checked)}
        />
        {t.isVip}
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t.internalNotes}
        </span>
        <Textarea
          rows={3}
          value={internalNotes}
          placeholder="—"
          onChange={(e) => setInternalNotes(e.target.value)}
        />
      </label>
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
