"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  addMilestone,
  deleteMilestone,
  moveMilestone,
  updateAboutPage,
  updateMilestone,
  type AboutPageInput,
} from "@/features/about/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import type { Tables } from "@/types/database";

interface Props {
  page: AboutPageInput;
  milestones: Tables<"about_milestones">[];
}

export function AboutEditor({ page, milestones }: Props) {
  return (
    <div className="space-y-8">
      <PageTextSection initial={page} />
      <MilestonesSection milestones={milestones} />
    </div>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PageTextSection({ initial }: { initial: AboutPageInput }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.aboutEditor;
  const [form, setForm] = React.useState<AboutPageInput>({ ...initial });
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const set =
    (key: keyof AboutPageInput) => (value: string) =>
      setForm((f) => ({ ...f, [key]: value || null }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.pageText}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = await updateAboutPage(form);
            setPending(false);
            setMsg(result.ok ? t.saved : result.error);
            if (result.ok) router.refresh();
          }}
        >
          <Labelled
            label={t.heroTitle}
            hint={t.heroHint}
          >
            <textarea
              className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.heroTitle ?? ""}
              onChange={(e) => set("heroTitle")(e.target.value)}
              placeholder={"One person.\nTwelve clients.\nOne city."}
            />
          </Labelled>
          <Labelled label={t.storyHeading}>
            <Input
              value={form.storyHeading ?? ""}
              onChange={(e) => set("storyHeading")(e.target.value)}
              placeholder="How one agent ended up knowing Dubai block by block."
            />
          </Labelled>
          <Labelled
            label={t.storyBody}
            hint={t.storyBodyHint}
          >
            <textarea
              className="min-h-[160px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.storyBody ?? ""}
              onChange={(e) => set("storyBody")(e.target.value)}
              placeholder="First paragraph…&#10;&#10;Second paragraph…"
            />
          </Labelled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label={t.pullQuote1} hint={t.pullQuote1Hint}>
              <textarea
                className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.quote1 ?? ""}
                onChange={(e) => set("quote1")(e.target.value)}
              />
            </Labelled>
            <Labelled label={t.pullQuote2} hint={t.pullQuote2Hint}>
              <textarea
                className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.quote2 ?? ""}
                onChange={(e) => set("quote2")(e.target.value)}
              />
            </Labelled>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="submit" disabled={pending}>
              {t.save}
            </Button>
            {msg ? (
              <span className="text-xs text-muted-foreground">{msg}</span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MilestoneRow({
  milestone,
  index,
  total,
  pending,
  onMove,
  onDelete,
}: {
  milestone: Tables<"about_milestones">;
  index: number;
  total: number;
  pending: boolean;
  onMove: (id: string, direction: "up" | "down") => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.aboutEditor;
  const [editing, setEditing] = React.useState(false);
  const [year, setYear] = React.useState(milestone.year);
  const [title, setTitle] = React.useState(milestone.title);
  const [body, setBody] = React.useState(milestone.body ?? "");
  const [busy, setBusy] = React.useState(false);

  async function save() {
    setBusy(true);
    const result = await updateMilestone(milestone.id, { year, title, body });
    setBusy(false);
    if (result.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  if (editing) {
    return (
      <li className="space-y-2 py-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder={t.year}
          />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.title}
          />
        </div>
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.body}
        />
        <div className="flex gap-1">
          <Button type="button" size="sm" onClick={save} disabled={busy}>
            {t.save}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(false)}
          >
            {t.cancel}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <span className="text-muted-foreground">{milestone.year}</span> ·{" "}
          {milestone.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {milestone.body}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pending || index === 0}
          aria-label={t.moveUp}
          onClick={() => onMove(milestone.id, "up")}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pending || index === total - 1}
          aria-label={t.moveDown}
          onClick={() => onMove(milestone.id, "down")}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t.editMilestone}
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(milestone.id)}
          disabled={pending}
          aria-label={t.removeMilestone}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function MilestonesSection({
  milestones,
}: {
  milestones: Tables<"about_milestones">[];
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.aboutEditor;
  const [year, setYear] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    setPending(true);
    setError(null);
    const result = await addMilestone({ year, title, body });
    setPending(false);
    if (result.ok) {
      setYear("");
      setTitle("");
      setBody("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    setPending(true);
    await deleteMilestone(id);
    setPending(false);
    router.refresh();
  }

  async function handleMove(id: string, direction: "up" | "down") {
    setPending(true);
    await moveMilestone(id, direction);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t.timelineMilestones}</h2>
        <p className="text-xs text-muted-foreground">
          {t.timelineDesc}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.milestones}</CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.length > 0 ? (
            <ul className="divide-y">
              {milestones.map((m, index) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  index={index}
                  total={milestones.length}
                  pending={pending}
                  onMove={handleMove}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t.noMilestones}
              description={t.noMilestonesDesc}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.addMilestone}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <div className="space-y-2">
              <label htmlFor="ms-year" className="text-sm font-medium">
                {t.year}
              </label>
              <Input
                id="ms-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2019"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ms-title" className="text-sm font-medium">
                {t.title}
              </label>
              <Input
                id="ms-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Went independent"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="ms-body" className="text-sm font-medium">
              {t.description}
            </label>
            <textarea
              id="ms-body"
              className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" onClick={handleAdd} disabled={pending}>
            {pending ? t.saving : t.addMilestone}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
