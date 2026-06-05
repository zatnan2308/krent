"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateDeal } from "@/features/crm/actions";
import type { DealDetail } from "@/features/crm/queries";
import type { DealStage } from "@/features/crm/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/lib/currency/config";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface DealEditorProps {
  deal: DealDetail;
  stages: DealStage[];
  canManage: boolean;
}

/** Редактор полей сделки: название, сумма, валюта, дата закрытия, стадия. */
export function DealEditor({ deal, stages, canManage }: DealEditorProps) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    title: deal.title,
    amount: deal.amount?.toString() ?? "",
    currency: deal.currency,
    expectedCloseDate: deal.expectedCloseDate ?? "",
    stageId: deal.stageId ?? "",
  });
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to edit deals.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateDeal({
          dealId: deal.id,
          title: form.title,
          amount: form.amount ? Number(form.amount) : null,
          currency: form.currency,
          expectedCloseDate: form.expectedCloseDate || null,
          stageId: form.stageId || null,
        });
        setPending(false);
        setMsg(result.ok ? "Deal saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">Title</span>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Amount</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Currency</span>
          <select
            className={FIELD_CLASS}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Expected close date</span>
          <Input
            type="date"
            value={form.expectedCloseDate}
            onChange={(e) =>
              setForm({ ...form, expectedCloseDate: e.target.value })
            }
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Stage</span>
          <select
            className={FIELD_CLASS}
            value={form.stageId}
            onChange={(e) => setForm({ ...form, stageId: e.target.value })}
          >
            <option value="">No stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save deal"}
        </Button>
        {msg ? (
          <span className="text-xs text-muted-foreground">{msg}</span>
        ) : null}
      </div>
    </form>
  );
}
