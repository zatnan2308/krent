"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  createSegment,
  deleteSegment,
  refreshSegment,
} from "@/features/campaigns/actions";
import {
  SEGMENT_CHANNELS,
  SEGMENT_RULES,
  type SegmentRule,
} from "@/features/campaigns/constants";
import type { SegmentListItem } from "@/features/campaigns/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ROLE_VALUES = [
  "buyer",
  "seller",
  "renter",
  "landlord",
  "investor",
  "other",
] as const;
const LIFECYCLE_VALUES = [
  "new",
  "nurture",
  "active",
  "under_contract",
  "past_client",
  "sphere",
] as const;

/** Конструктор и список сегментов контактов. */
export function SegmentManager({
  segments,
}: {
  segments: SegmentListItem[];
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashMarketing;
  const ruleHints: Record<SegmentRule, string> = {
    all: "",
    lead_type: t.hintLeadType,
    role: "buyer / seller / renter / landlord / investor",
    lifecycle: "new / nurture / active / under_contract / past_client / sphere",
    tag: t.hintTag,
    channel: "",
    language: t.hintLanguage,
    currency: t.hintCurrency,
    city: t.hintCity,
    property_type: t.hintPropertyType,
  };
  const roleValueLabels: Record<string, string> = {
    buyer: dict.dashCrm.roleBuyer,
    seller: dict.dashCrm.roleSeller,
    renter: dict.dashCrm.roleRenter,
    landlord: dict.dashCrm.roleLandlord,
    investor: dict.dashCrm.roleInvestor,
    other: dict.dashCrm.roleOther,
  };
  const lifecycleValueLabels: Record<string, string> = {
    new: dict.dashCrm.lcNew,
    nurture: dict.dashCrm.lcNurture,
    active: dict.dashCrm.lcActive,
    under_contract: dict.dashCrm.lcUnderContract,
    past_client: dict.dashCrm.lcPastClient,
    sphere: dict.dashCrm.lcSphere,
  };
  const [name, setName] = React.useState("");
  const [rule, setRule] = React.useState<SegmentRule>("lead_type");
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError(t.enterSegmentName);
      return;
    }
    setPending(true);
    setError(null);
    const result = await createSegment({
      name: name.trim(),
      description: null,
      rule,
      value: rule === "all" ? "" : value.trim(),
    });
    setPending(false);
    if (result.ok) {
      setName("");
      setValue("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleRefresh(id: string) {
    setPending(true);
    setError(null);
    const result = await refreshSegment(id);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    setPending(true);
    setError(null);
    const result = await deleteSegment(id);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">{t.createSegment}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={name}
            placeholder={t.segmentNamePh}
            aria-label={t.segmentNamePh}
            onChange={(event) => setName(event.target.value)}
          />
          <select
            className={FIELD_CLASS}
            value={rule}
            aria-label={t.segmentRuleAria}
            onChange={(event) => {
              setRule(event.target.value as SegmentRule);
              setValue("");
            }}
          >
            {SEGMENT_RULES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {rule === "all" ? (
            <div className="flex items-center text-sm text-muted-foreground">
              {t.everyContact}
            </div>
          ) : rule === "channel" ? (
            <select
              className={FIELD_CLASS}
              value={value}
              aria-label={t.channelAria}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">{t.selectChannel}</option>
              {SEGMENT_CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
          ) : rule === "role" ? (
            <select
              className={FIELD_CLASS}
              value={value}
              aria-label={t.segmentValueAria}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">{t.selectValue}</option>
              {ROLE_VALUES.map((option) => (
                <option key={option} value={option}>
                  {roleValueLabels[option]}
                </option>
              ))}
            </select>
          ) : rule === "lifecycle" ? (
            <select
              className={FIELD_CLASS}
              value={value}
              aria-label={t.segmentValueAria}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">{t.selectValue}</option>
              {LIFECYCLE_VALUES.map((option) => (
                <option key={option} value={option}>
                  {lifecycleValueLabels[option]}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={value}
              placeholder={ruleHints[rule]}
              aria-label={t.segmentValueAria}
              onChange={(event) => setValue(event.target.value)}
            />
          )}
        </div>
        <Button type="button" size="sm" disabled={pending} onClick={handleCreate}>
          {t.createSegmentBtn}
        </Button>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <ul className="divide-y rounded-lg border">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {segment.name}
                {segment.isSystem ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t.systemLabel}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.segmentMeta
                  .replace("{n}", String(segment.memberCount))
                  .replace("{rule}", segment.rule)}
                {segment.value ? ` = ${segment.value}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleRefresh(segment.id)}
              >
                {t.refresh}
              </Button>
              {!segment.isSystem ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => handleDelete(segment.id)}
                >
                  {t.deleteBtn}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
