"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  resetEmailTemplate,
  saveEmailTemplate,
} from "@/features/notifications/actions";
import { TEMPLATE_VARIABLES } from "@/features/notifications/constants";
import type { EffectiveEmailTemplate } from "@/features/notifications/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Редактор email-шаблона: тема, HTML-контент, активность. */
export function TemplateEditor({
  template,
}: {
  template: EffectiveEmailTemplate;
}) {
  const router = useRouter();
  const [subject, setSubject] = React.useState(template.subject);
  const [bodyHtml, setBodyHtml] = React.useState(template.bodyHtml);
  const [isActive, setIsActive] = React.useState(template.isActive);
  const [customised, setCustomised] = React.useState(template.isCustomised);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setMessage(null);
    const result = await saveEmailTemplate({
      key: template.key,
      subject: subject.trim(),
      bodyHtml: bodyHtml.trim(),
      isActive,
    });
    setPending(false);
    if (result.ok) {
      setCustomised(true);
      setMessage("Saved.");
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleReset() {
    setPending(true);
    setMessage(null);
    const result = await resetEmailTemplate(template.key);
    setPending(false);
    if (result.ok) {
      setSubject(template.systemSubject);
      setBodyHtml(template.systemBodyHtml);
      setIsActive(true);
      setCustomised(false);
      setMessage("Reset to the default template.");
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="tpl-subject" className="text-sm font-medium">
          Subject
        </label>
        <Input
          id="tpl-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tpl-body" className="text-sm font-medium">
          Body (HTML)
        </label>
        <Textarea
          id="tpl-body"
          rows={12}
          className="font-mono text-xs"
          value={bodyHtml}
          onChange={(event) => setBodyHtml(event.target.value)}
        />
      </div>

      <div className="rounded-md border bg-muted/40 p-3">
        <p className="text-xs font-medium">Available variables</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((variable) => (
            <code
              key={variable}
              className="rounded bg-background px-1.5 py-0.5 text-xs"
            >
              {`{{${variable}}}`}
            </code>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Template is active
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={handleSave}>
          Save template
        </Button>
        {customised ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleReset}
          >
            Reset to default
          </Button>
        ) : null}
        {message ? (
          <span className="text-sm text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </div>
  );
}
