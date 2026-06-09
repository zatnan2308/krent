"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { upsertContactSellerProfile } from "@/features/crm/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface SellerProfile {
  address: string | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  yearBuilt: number | null;
  expectedPrice: number | null;
  mortgageBalance: number | null;
  hoaFees: number | null;
  reason: string | null;
  timeline: string | null;
  needsCounterPurchase: boolean;
  contractType: string | null;
  commissionNote: string | null;
  currency: string | null;
  notes: string | null;
}

interface Props {
  contactId: string;
  profile: SellerProfile | null;
  defaultCurrency: string;
  canManage: boolean;
}

function numOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) || n < 0 ? null : n;
}
function intOrNull(value: string): number | null {
  const n = numOrNull(value);
  return n === null ? null : Math.round(n);
}
function str(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/** Профиль продавца (блок E): объект на продажу и условия. */
export function ContactSellerProfileForm({
  contactId,
  profile,
  defaultCurrency,
  canManage,
}: Props) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [address, setAddress] = React.useState(profile?.address ?? "");
  const [propertyType, setPropertyType] = React.useState(
    profile?.propertyType ?? "",
  );
  const [beds, setBeds] = React.useState(str(profile?.beds));
  const [baths, setBaths] = React.useState(str(profile?.baths));
  const [area, setArea] = React.useState(str(profile?.area));
  const [yearBuilt, setYearBuilt] = React.useState(str(profile?.yearBuilt));
  const [expectedPrice, setExpectedPrice] = React.useState(
    str(profile?.expectedPrice),
  );
  const [mortgageBalance, setMortgageBalance] = React.useState(
    str(profile?.mortgageBalance),
  );
  const [hoaFees, setHoaFees] = React.useState(str(profile?.hoaFees));
  const [reason, setReason] = React.useState(profile?.reason ?? "");
  const [timeline, setTimeline] = React.useState(profile?.timeline ?? "");
  const [needsCounterPurchase, setNeedsCounterPurchase] = React.useState(
    profile?.needsCounterPurchase ?? false,
  );
  const [contractType, setContractType] = React.useState(
    profile?.contractType ?? "",
  );
  const [commissionNote, setCommissionNote] = React.useState(
    profile?.commissionNote ?? "",
  );
  const [currency, setCurrency] = React.useState(
    profile?.currency ?? defaultCurrency,
  );
  const [notes, setNotes] = React.useState(profile?.notes ?? "");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  if (!canManage) {
    return (
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t.sellerAddress}</dt>
          <dd>{profile?.address ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t.expectedPrice}</dt>
          <dd>
            {profile?.expectedPrice != null
              ? `${profile.expectedPrice} ${profile.currency ?? ""}`
              : "—"}
          </dd>
        </div>
      </dl>
    );
  }

  async function handleSave() {
    setPending(true);
    setMsg(null);
    const result = await upsertContactSellerProfile({
      contactId,
      address: address.trim() || null,
      propertyType: propertyType || null,
      beds: intOrNull(beds),
      baths: numOrNull(baths),
      area: numOrNull(area),
      yearBuilt: intOrNull(yearBuilt),
      expectedPrice: numOrNull(expectedPrice),
      mortgageBalance: numOrNull(mortgageBalance),
      hoaFees: numOrNull(hoaFees),
      reason: reason.trim() || null,
      timeline: timeline.trim() || null,
      needsCounterPurchase,
      contractType: contractType || null,
      commissionNote: commissionNote.trim() || null,
      currency: currency.trim() || null,
      notes: notes.trim() || null,
    });
    setPending(false);
    setMsg(result.ok ? t.saved : result.error);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-2.5">
      <Field label={t.sellerAddress}>
        <Input
          value={address}
          placeholder="—"
          onChange={(e) => setAddress(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t.propertyTypeLabel}>
          <select
            className={FIELD_CLASS}
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="">{t.ptNone}</option>
            <option value="apartment">{t.ptApartment}</option>
            <option value="house">{t.ptHouse}</option>
            <option value="townhouse">{t.ptTownhouse}</option>
            <option value="commercial">{t.ptCommercial}</option>
            <option value="land">{t.ptLand}</option>
          </select>
        </Field>
        <Field label={t.yearBuilt}>
          <Input
            type="number"
            value={yearBuilt}
            placeholder="—"
            onChange={(e) => setYearBuilt(e.target.value)}
          />
        </Field>
        <Field label={t.sellerBeds}>
          <Input
            type="number"
            min={0}
            value={beds}
            placeholder="—"
            onChange={(e) => setBeds(e.target.value)}
          />
        </Field>
        <Field label={t.sellerBaths}>
          <Input
            type="number"
            min={0}
            step="0.5"
            value={baths}
            placeholder="—"
            onChange={(e) => setBaths(e.target.value)}
          />
        </Field>
        <Field label={t.sellerArea}>
          <Input
            type="number"
            min={0}
            value={area}
            placeholder="—"
            onChange={(e) => setArea(e.target.value)}
          />
        </Field>
        <Field label={t.currency}>
          <Input
            value={currency}
            placeholder="—"
            onChange={(e) => setCurrency(e.target.value)}
          />
        </Field>
        <Field label={t.expectedPrice}>
          <Input
            type="number"
            min={0}
            value={expectedPrice}
            placeholder="—"
            onChange={(e) => setExpectedPrice(e.target.value)}
          />
        </Field>
        <Field label={t.mortgageBalance}>
          <Input
            type="number"
            min={0}
            value={mortgageBalance}
            placeholder="—"
            onChange={(e) => setMortgageBalance(e.target.value)}
          />
        </Field>
        <Field label={t.hoaFees}>
          <Input
            type="number"
            min={0}
            value={hoaFees}
            placeholder="—"
            onChange={(e) => setHoaFees(e.target.value)}
          />
        </Field>
        <Field label={t.sellTimeline}>
          <Input
            value={timeline}
            placeholder="—"
            onChange={(e) => setTimeline(e.target.value)}
          />
        </Field>
        <Field label={t.contractType}>
          <select
            className={FIELD_CLASS}
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
          >
            <option value="">{t.ctNone}</option>
            <option value="exclusive">{t.ctExclusive}</option>
            <option value="open">{t.ctOpen}</option>
          </select>
        </Field>
        <Field label={t.commissionNote}>
          <Input
            value={commissionNote}
            placeholder="—"
            onChange={(e) => setCommissionNote(e.target.value)}
          />
        </Field>
      </div>
      <Field label={t.sellReason}>
        <Textarea
          rows={2}
          value={reason}
          placeholder="—"
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <Field label={t.sellNotes}>
        <Textarea
          rows={2}
          value={notes}
          placeholder="—"
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={needsCounterPurchase}
          onChange={(e) => setNeedsCounterPurchase(e.target.checked)}
        />
        {t.needsCounterPurchase}
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
