"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  deleteAutomationFlow,
  setAutomationFlowActive,
} from "@/features/automations/actions";
import { Button } from "@/components/ui/button";

/** Переключатель активности и удаление флоу в списке. */
export function AutomationListControls({
  flowId,
  isActive,
}: {
  flowId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function toggle() {
    setPending(true);
    await setAutomationFlowActive(flowId, !isActive);
    setPending(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this automation? This cannot be undone.")) {
      return;
    }
    setPending(true);
    const result = await deleteAutomationFlow(flowId);
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={isActive}
          disabled={pending}
          onChange={() => void toggle()}
          className="h-4 w-4 rounded border-input"
        />
        Active
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => void remove()}
        className="text-destructive hover:text-destructive"
      >
        Delete
      </Button>
    </div>
  );
}
