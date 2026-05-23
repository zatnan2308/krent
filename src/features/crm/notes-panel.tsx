"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { createNote, deleteNote } from "@/features/crm/actions";
import type { NoteItem } from "@/features/crm/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";

interface NotesPanelProps {
  notes: NoteItem[];
  canManage: boolean;
  leadId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
}

/** Список заметок с добавлением и удалением. */
export function NotesPanel({
  notes,
  canManage,
  leadId = null,
  contactId = null,
  dealId = null,
}: NotesPanelProps) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    if (!body.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await createNote({
      body: body.trim(),
      leadId,
      contactId,
      dealId,
    });
    setPending(false);
    if (result.ok) {
      setBody("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(noteId: string) {
    setPending(true);
    setError(null);
    const result = await deleteNote(noteId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="space-y-2">
          <Textarea
            value={body}
            rows={3}
            placeholder="Add a note..."
            onChange={(event) => setBody(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleAdd}
          >
            Add note
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-line text-sm">{note.body}</p>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive"
                    disabled={pending}
                    aria-label="Delete note"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {note.authorName ?? "Team member"} ·{" "}
                {new Date(note.createdAt).toLocaleDateString("en-US")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No notes yet"
          description="Notes added by the team will appear here."
        />
      )}
    </div>
  );
}
