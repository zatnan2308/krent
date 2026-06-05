"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { startInternalConversation } from "@/features/chat/actions";
import { Button } from "@/components/ui/button";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface NewInternalChatFormProps {
  members: { id: string; name: string }[];
  basePath: string;
}

/** Старт внутреннего диалога с коллегами (сторона сотрудника). */
export function NewInternalChatForm({
  members,
  basePath,
}: NewInternalChatFormProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (members.length === 0) {
    return null;
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleStart() {
    if (selected.length === 0) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await startInternalConversation({
      memberIds: selected,
      title: title.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      setSelected([]);
      setTitle("");
      setOpen(false);
      router.push(`${basePath}?c=${result.conversationId}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        New internal chat
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Internal chat</p>
      <input
        className={FIELD_CLASS}
        value={title}
        placeholder="Topic (optional)"
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
        {members.map((member) => (
          <label
            key={member.id}
            className="flex items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(member.id)}
              onChange={() => toggle(member.id)}
            />
            <span className="truncate">{member.name}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || selected.length === 0}
          onClick={handleStart}
        >
          {pending ? "Starting..." : "Start"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
