"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateContactClassification } from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Role =
  | "buyer"
  | "seller"
  | "renter"
  | "landlord"
  | "investor"
  | "other";
type Lifecycle =
  | "new"
  | "nurture"
  | "active"
  | "under_contract"
  | "past_client"
  | "sphere";
type Temperature = "hot" | "warm" | "cold";
type Priority = "low" | "medium" | "high";

export interface ContactClassification {
  id: string;
  role: string | null;
  lifecycleStage: string;
  temperature: string | null;
  leadScore: number | null;
  priority: string | null;
  tags: string[];
}

const ROLES: Role[] = ["buyer", "seller", "renter", "landlord", "investor", "other"];
const LIFECYCLES: Lifecycle[] = [
  "new",
  "nurture",
  "active",
  "under_contract",
  "past_client",
  "sphere",
];
const TEMPS: Temperature[] = ["hot", "warm", "cold"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

/** Классификация контакта: роль, стадия, температура, скор, приоритет, теги. */
export function ContactClassificationForm({
  contact,
  canManage,
}: {
  contact: ContactClassification;
  canManage: boolean;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [role, setRole] = React.useState(contact.role ?? "");
  const [lifecycle, setLifecycle] = React.useState(
    contact.lifecycleStage || "new",
  );
  const [temperature, setTemperature] = React.useState(contact.temperature ?? "");
  const [leadScore, setLeadScore] = React.useState(
    contact.leadScore === null ? "" : String(contact.leadScore),
  );
  const [priority, setPriority] = React.useState(contact.priority ?? "");
  const [tags, setTags] = React.useState(contact.tags.join(", "));
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const roleLabels: Record<Role, string> = {
    buyer: t.roleBuyer,
    seller: t.roleSeller,
    renter: t.roleRenter,
    landlord: t.roleLandlord,
    investor: t.roleInvestor,
    other: t.roleOther,
  };
  const lifecycleLabels: Record<Lifecycle, string> = {
    new: t.lcNew,
    nurture: t.lcNurture,
    active: t.lcActive,
    under_contract: t.lcUnderContract,
    past_client: t.lcPastClient,
    sphere: t.lcSphere,
  };
  const tempLabels: Record<Temperature, string> = {
    hot: t.tempHot,
    warm: t.tempWarm,
    cold: t.tempCold,
  };
  const prioLabels: Record<Priority, string> = {
    low: t.prioLow,
    medium: t.prioMedium,
    high: t.prioHigh,
  };

  if (!canManage) {
    return (
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t.roleLabel}</dt>
          <dd>{contact.role ? roleLabels[contact.role as Role] : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t.lifecycleLabel}</dt>
          <dd>{lifecycleLabels[contact.lifecycleStage as Lifecycle] ?? "—"}</dd>
        </div>
        {contact.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </dl>
    );
  }

  async function handleSave() {
    setPending(true);
    setMsg(null);
    const score = leadScore.trim() === "" ? null : Number(leadScore);
    const result = await updateContactClassification({
      contactId: contact.id,
      role: (role || null) as Role | null,
      lifecycleStage: lifecycle as Lifecycle,
      temperature: (temperature || null) as Temperature | null,
      leadScore:
        score === null || Number.isNaN(score)
          ? null
          : Math.max(0, Math.min(100, Math.round(score))),
      priority: (priority || null) as Priority | null,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setPending(false);
    setMsg(result.ok ? t.saved : result.error);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t.roleLabel}
          </span>
          <select
            className={FIELD_CLASS}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">{t.roleNone}</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t.lifecycleLabel}
          </span>
          <select
            className={FIELD_CLASS}
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
          >
            {LIFECYCLES.map((value) => (
              <option key={value} value={value}>
                {lifecycleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t.temperatureLabel}
          </span>
          <select
            className={FIELD_CLASS}
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
          >
            <option value="">{t.tempNone}</option>
            {TEMPS.map((value) => (
              <option key={value} value={value}>
                {tempLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t.priorityLabel}
          </span>
          <select
            className={FIELD_CLASS}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">{t.prioNone}</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {prioLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t.leadScoreLabel}
        </span>
        <Input
          type="number"
          min={0}
          max={100}
          value={leadScore}
          placeholder="—"
          onChange={(e) => setLeadScore(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t.tagsLabel}
        </span>
        <Input
          value={tags}
          placeholder={t.tagsHint}
          onChange={(e) => setTags(e.target.value)}
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
