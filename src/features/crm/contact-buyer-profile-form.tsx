"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { upsertContactBuyerProfile } from "@/features/crm/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface BuyerProfile {
  paymentMethod: string | null;
  preapprovalStatus: string | null;
  preapprovalAmount: number | null;
  lenderName: string | null;
  downPayment: number | null;
  needsToSellFirst: boolean;
  currentHousing: string | null;
  currency: string | null;
}

interface ContactBuyerProfileFormProps {
  contactId: string;
  profile: BuyerProfile | null;
  defaultCurrency: string;
  canManage: boolean;
}

function numOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) || n < 0 ? null : n;
}

/** Финансовый профиль покупателя (блок C): оплата, пред-одобрение и т.п. */
export function ContactBuyerProfileForm({
  contactId,
  profile,
  defaultCurrency,
  canManage,
}: ContactBuyerProfileFormProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [paymentMethod, setPaymentMethod] = React.useState(
    profile?.paymentMethod ?? "",
  );
  const [preapprovalStatus, setPreapprovalStatus] = React.useState(
    profile?.preapprovalStatus ?? "",
  );
  const [preapprovalAmount, setPreapprovalAmount] = React.useState(
    profile?.preapprovalAmount === null || profile?.preapprovalAmount === undefined
      ? ""
      : String(profile.preapprovalAmount),
  );
  const [lenderName, setLenderName] = React.useState(profile?.lenderName ?? "");
  const [downPayment, setDownPayment] = React.useState(
    profile?.downPayment === null || profile?.downPayment === undefined
      ? ""
      : String(profile.downPayment),
  );
  const [needsToSellFirst, setNeedsToSellFirst] = React.useState(
    profile?.needsToSellFirst ?? false,
  );
  const [currentHousing, setCurrentHousing] = React.useState(
    profile?.currentHousing ?? "",
  );
  const [currency, setCurrency] = React.useState(
    profile?.currency ?? defaultCurrency,
  );
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  if (!canManage) {
    return (
      <dl className="space-y-1 text-sm">
        <Row label={t.paymentMethod} value={paymentMethodLabel()} />
        <Row label={t.preapprovalLabel} value={preapprovalLabel()} />
        {profile?.lenderName ? (
          <Row label={t.lenderLabel} value={profile.lenderName} />
        ) : null}
      </dl>
    );
  }

  function paymentMethodLabel(): string {
    if (paymentMethod === "cash") return t.payCash;
    if (paymentMethod === "mortgage") return t.payMortgage;
    return "—";
  }
  function preapprovalLabel(): string {
    if (preapprovalStatus === "in_progress") return t.preInProgress;
    if (preapprovalStatus === "approved") return t.preApproved;
    return "—";
  }

  async function handleSave() {
    setPending(true);
    setMsg(null);
    const result = await upsertContactBuyerProfile({
      contactId,
      paymentMethod: paymentMethod || null,
      preapprovalStatus: preapprovalStatus || null,
      preapprovalAmount: numOrNull(preapprovalAmount),
      lenderName: lenderName.trim() || null,
      downPayment: numOrNull(downPayment),
      needsToSellFirst,
      currentHousing: currentHousing || null,
      currency: currency.trim() || null,
    });
    setPending(false);
    setMsg(result.ok ? t.saved : result.error);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Field label={t.paymentMethod}>
          <select
            className={FIELD_CLASS}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="">{t.payNone}</option>
            <option value="cash">{t.payCash}</option>
            <option value="mortgage">{t.payMortgage}</option>
          </select>
        </Field>
        <Field label={t.preapprovalLabel}>
          <select
            className={FIELD_CLASS}
            value={preapprovalStatus}
            onChange={(e) => setPreapprovalStatus(e.target.value)}
          >
            <option value="">{t.preNone}</option>
            <option value="in_progress">{t.preInProgress}</option>
            <option value="approved">{t.preApproved}</option>
          </select>
        </Field>
        <Field label={t.preapprovalAmount}>
          <Input
            type="number"
            min={0}
            value={preapprovalAmount}
            placeholder="—"
            onChange={(e) => setPreapprovalAmount(e.target.value)}
          />
        </Field>
        <Field label={t.downPayment}>
          <Input
            type="number"
            min={0}
            value={downPayment}
            placeholder="—"
            onChange={(e) => setDownPayment(e.target.value)}
          />
        </Field>
        <Field label={t.lenderLabel}>
          <Input
            value={lenderName}
            placeholder="—"
            onChange={(e) => setLenderName(e.target.value)}
          />
        </Field>
        <Field label={t.currency}>
          <Input
            value={currency}
            placeholder="—"
            onChange={(e) => setCurrency(e.target.value)}
          />
        </Field>
        <Field label={t.currentHousing}>
          <select
            className={FIELD_CLASS}
            value={currentHousing}
            onChange={(e) => setCurrentHousing(e.target.value)}
          >
            <option value="">{t.housNone}</option>
            <option value="rent">{t.housRent}</option>
            <option value="own">{t.housOwn}</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={needsToSellFirst}
          onChange={(e) => setNeedsToSellFirst(e.target.checked)}
        />
        {t.needsToSellFirst}
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
