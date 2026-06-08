"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  addAutomationStep,
  deleteAutomationStep,
  setAutomationFlowActive,
  updateAutomationFlow,
  updateAutomationStep,
} from "@/features/automations/actions";
import {
  AUTOMATION_STEP_LABELS,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGERS,
  AUTOMATION_VARIABLES,
  type AutomationTrigger,
} from "@/features/automations/constants";
import type { AutomationStepItem } from "@/features/automations/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface AutomationEditorProps {
  flow: {
    id: string;
    name: string;
    triggerEvent: string | null;
    description: string | null;
    isActive: boolean;
  };
  steps: AutomationStepItem[];
}

/** Редактор флоу: метаданные, активность и список шагов. */
export function AutomationEditor({ flow, steps }: AutomationEditorProps) {
  const router = useRouter();
  const initialTrigger: AutomationTrigger =
    flow.triggerEvent &&
    (AUTOMATION_TRIGGERS as readonly string[]).includes(flow.triggerEvent)
      ? (flow.triggerEvent as AutomationTrigger)
      : AUTOMATION_TRIGGERS[0];

  const [name, setName] = React.useState(flow.name);
  const [trigger, setTrigger] = React.useState<AutomationTrigger>(
    initialTrigger,
  );
  const [description, setDescription] = React.useState(flow.description ?? "");
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function saveMeta() {
    setPending(true);
    setMessage(null);
    const result = await updateAutomationFlow({
      flowId: flow.id,
      name: name.trim(),
      triggerEvent: trigger,
      description: description.trim() || null,
    });
    setPending(false);
    setMessage(result.ok ? "Saved." : result.error);
    if (result.ok) router.refresh();
  }

  async function toggleActive() {
    setPending(true);
    await setAutomationFlowActive(flow.id, !flow.isActive);
    setPending(false);
    router.refresh();
  }

  async function addStep(stepType: "delay" | "send_email") {
    setPending(true);
    setMessage(null);
    const result = await addAutomationStep(flow.id, stepType);
    setPending(false);
    if (result.ok) router.refresh();
    else setMessage(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="flow-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="flow-name"
              value={name}
              maxLength={150}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="flow-trigger" className="text-sm font-medium">
              Trigger
            </label>
            <select
              id="flow-trigger"
              className={FIELD_CLASS}
              value={trigger}
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
        </div>
        <div className="space-y-1.5">
          <label htmlFor="flow-desc" className="text-sm font-medium">
            Description
          </label>
          <Input
            id="flow-desc"
            value={description}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={pending || name.trim().length === 0}
            onClick={() => void saveMeta()}
          >
            Save
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={flow.isActive}
              disabled={pending}
              onChange={() => void toggleActive()}
            />
            Active
          </label>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Steps</p>
        {steps.length > 0 ? (
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <StepRow key={step.id} step={step} index={index} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            No steps yet. Add a wait or an email below.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void addStep("delay")}
          >
            + {AUTOMATION_STEP_LABELS.delay}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void addStep("send_email")}
          >
            + {AUTOMATION_STEP_LABELS.send_email}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Одна строка-редактор шага. */
function StepRow({ step, index }: { step: AutomationStepItem; index: number }) {
  const router = useRouter();
  const isDelay = step.stepType === "delay";
  const [minutes, setMinutes] = React.useState(
    String((step.config.minutes as number | undefined) ?? 60),
  );
  const [subject, setSubject] = React.useState(
    String((step.config.subject as string | undefined) ?? ""),
  );
  const [body, setBody] = React.useState(
    String((step.config.body as string | undefined) ?? ""),
  );
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function save() {
    setPending(true);
    setSaved(false);
    const result = await updateAutomationStep(
      isDelay
        ? { stepId: step.id, minutes: Number(minutes) || 0 }
        : { stepId: step.id, subject, body },
    );
    setPending(false);
    if (result.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  async function remove() {
    setPending(true);
    const result = await deleteAutomationStep(step.id);
    setPending(false);
    if (result.ok) router.refresh();
  }

  return (
    <li className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {index + 1}.{" "}
          {isDelay
            ? AUTOMATION_STEP_LABELS.delay
            : AUTOMATION_STEP_LABELS.send_email}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => void remove()}
          className="text-destructive hover:text-destructive"
        >
          Remove
        </Button>
      </div>

      {isDelay ? (
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Wait minutes</label>
            <Input
              type="number"
              min={0}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="w-40"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={subject}
            placeholder="Email subject"
            maxLength={300}
            onChange={(event) => setSubject(event.target.value)}
          />
          <Textarea
            rows={6}
            value={body}
            placeholder="Email body (HTML allowed)"
            className="font-mono text-xs"
            onChange={(event) => setBody(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Variables:{" "}
            {AUTOMATION_VARIABLES.map((v) => `{{${v}}}`).join(", ")}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void save()}
        >
          Save step
        </Button>
        {saved ? (
          <span className="text-xs text-muted-foreground">Saved.</span>
        ) : null}
      </div>
    </li>
  );
}
