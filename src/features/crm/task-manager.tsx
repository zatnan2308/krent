"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { createTask, deleteTask, setTaskStatus } from "@/features/crm/actions";
import { TASK_PRIORITY_OPTIONS } from "@/features/crm/constants";
import type { TaskItem } from "@/features/crm/queries";
import type { TaskPriority } from "@/features/crm/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function priorityVariant(
  priority: TaskPriority,
): "destructive" | "secondary" | "outline" {
  if (priority === "high") {
    return "destructive";
  }
  if (priority === "medium") {
    return "secondary";
  }
  return "outline";
}

interface TaskManagerProps {
  tasks: TaskItem[];
  canManage: boolean;
  leadId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  showRelations?: boolean;
}

/** Список задач с созданием, отметкой выполнения и удалением. */
export function TaskManager({
  tasks,
  canManage,
  leadId = null,
  contactId = null,
  dealId = null,
  showRelations = false,
}: TaskManagerProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("medium");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await createTask({
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate || null,
      priority,
      leadId,
      contactId,
      dealId,
    });
    setPending(false);
    if (result.ok) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleToggle(task: TaskItem) {
    setPending(true);
    setError(null);
    const next = task.status === "completed" ? "open" : "completed";
    const result = await setTaskStatus(task.id, next);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleDelete(taskId: string) {
    setPending(true);
    setError(null);
    const result = await deleteTask(taskId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="space-y-2 rounded-md border p-3">
          <Input
            value={title}
            placeholder="Task title"
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            value={description}
            rows={2}
            placeholder="Details (optional)"
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="date"
              value={dueDate}
              aria-label="Due date"
              onChange={(event) => setDueDate(event.target.value)}
            />
            <select
              className={FIELD_CLASS}
              value={priority}
              aria-label="Priority"
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
            >
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleCreate}
          >
            Add task
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {tasks.length > 0 ? (
        <ul className="divide-y">
          {tasks.map((task) => {
            const done = task.status === "completed";
            return (
              <li key={task.id} className="flex items-start gap-3 py-3">
                {canManage ? (
                  <Checkbox
                    checked={done}
                    disabled={pending}
                    className="mt-0.5"
                    aria-label="Toggle task completion"
                    onCheckedChange={() => handleToggle(task)}
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.description ? (
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={priorityVariant(task.priority)}>
                      {task.priority}
                    </Badge>
                    {task.dueDate ? <span>Due {task.dueDate}</span> : null}
                    {task.agentName ? <span>· {task.agentName}</span> : null}
                    {showRelations && task.leadId ? (
                      <Link
                        href={`${ROUTES.dashboard.crmLeads}/${task.leadId}`}
                        className="hover:underline"
                      >
                        Lead
                      </Link>
                    ) : null}
                    {showRelations && task.contactId ? (
                      <Link
                        href={`${ROUTES.dashboard.crmContacts}/${task.contactId}`}
                        className="hover:underline"
                      >
                        Contact
                      </Link>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive"
                    disabled={pending}
                    aria-label="Delete task"
                    onClick={() => handleDelete(task.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="No tasks"
          description="Tasks you create will appear here."
        />
      )}
    </div>
  );
}
