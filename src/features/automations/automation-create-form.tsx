"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createAutomationFlow } from "@/features/automations/actions";
import {
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGERS,
  type AutomationTrigger,
} from "@/features/automations/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/constants/routes";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Форма создания нового флоу автоматизации. */
export function AutomationCreateForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [trigger, setTrigger] = React.useState<AutomationTrigger>(
    AUTOMATION_TRIGGERS[0],
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || name.trim().length === 0) return;
    setPending(true);
    setError(null);
    const result = await createAutomationFlow({
      name: name.trim(),
      triggerEvent: trigger,
      description: null,
    });
    setPending(false);
    if (result.ok) {
      router.push(`${ROUTES.dashboard.marketingAutomations}/${result.id}`);
    } else {
      setError(result.error);
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        New automation
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
    >
      <p className="text-sm font-semibold">New automation</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Automation name"
          required
          maxLength={150}
          aria-label="Automation name"
        />
        <select
          className={FIELD_CLASS}
          value={trigger}
          aria-label="Trigger"
          onChange={(event) =>
            setTrigger(event.target.value as AutomationTrigger)
          }
        >
          {AUTOMATION_TRIGGERS.map((value) => (
            <option key={value} value={value}>
              {AUTOMATION_TRIGGER_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || name.trim().length === 0}
        >
          Create
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setName("");
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
