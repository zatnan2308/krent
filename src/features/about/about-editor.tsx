"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  addMilestone,
  deleteMilestone,
  updateAboutPage,
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
  const [form, setForm] = React.useState<AboutPageInput>({ ...initial });
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const set =
    (key: keyof AboutPageInput) => (value: string) =>
      setForm((f) => ({ ...f, [key]: value || null }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Page text</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = await updateAboutPage(form);
            setPending(false);
            setMsg(result.ok ? "Saved." : result.error);
            if (result.ok) router.refresh();
          }}
        >
          <Labelled
            label="Hero title"
            hint="One line per row. Leave blank to keep the default."
          >
            <textarea
              className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.heroTitle ?? ""}
              onChange={(e) => set("heroTitle")(e.target.value)}
              placeholder={"One person.\nTwelve clients.\nOne city."}
            />
          </Labelled>
          <Labelled label="Story heading">
            <Input
              value={form.storyHeading ?? ""}
              onChange={(e) => set("storyHeading")(e.target.value)}
              placeholder="How one agent ended up knowing Dubai block by block."
            />
          </Labelled>
          <Labelled
            label="Story body"
            hint="Separate paragraphs with a blank line."
          >
            <textarea
              className="min-h-[160px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.storyBody ?? ""}
              onChange={(e) => set("storyBody")(e.target.value)}
              placeholder="First paragraph…&#10;&#10;Second paragraph…"
            />
          </Labelled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Pull-quote 1" hint="Shown after the first paragraph.">
              <textarea
                className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.quote1 ?? ""}
                onChange={(e) => set("quote1")(e.target.value)}
              />
            </Labelled>
            <Labelled label="Pull-quote 2" hint="Shown later in the story.">
              <textarea
                className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.quote2 ?? ""}
                onChange={(e) => set("quote2")(e.target.value)}
              />
            </Labelled>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="submit" disabled={pending}>
              Save
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

function MilestonesSection({
  milestones,
}: {
  milestones: Tables<"about_milestones">[];
}) {
  const router = useRouter();
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Timeline milestones</h2>
        <p className="text-xs text-muted-foreground">
          The dated milestones on the public About page. Leave empty to use the
          built-in defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.length > 0 ? (
            <ul className="divide-y">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">{m.year}</span>{" "}
                      · {m.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.body}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleDelete(m.id)}
                    disabled={pending}
                    aria-label="Remove milestone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No milestones"
              description="Add milestones to build the timeline."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Add milestone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <div className="space-y-2">
              <label htmlFor="ms-year" className="text-sm font-medium">
                Year
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
                Title
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
              Description
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
            {pending ? "Saving..." : "Add milestone"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
