"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteHomeItem,
  saveAbout,
  saveCta,
  saveHero,
  saveMarket,
  savePressLogo,
  saveProcessStep,
  saveTestimonial,
  saveTrustBadge,
  type AboutInput,
  type CtaInput,
  type HeroInput,
  type MarketInput,
  type PressInput,
  type ProcessInput,
  type TestimonialInput,
  type TrustInput,
} from "./actions";
import type { HomeContent } from "./queries";

type Tab =
  | "hero"
  | "about"
  | "markets"
  | "process"
  | "testimonials"
  | "trust"
  | "press"
  | "cta";

const TABS: { key: Tab; label: string }[] = [
  { key: "hero", label: "Hero" },
  { key: "about", label: "About" },
  { key: "markets", label: "Markets" },
  { key: "process", label: "Process" },
  { key: "testimonials", label: "Testimonials" },
  { key: "trust", label: "Trust badges" },
  { key: "press", label: "Press" },
  { key: "cta", label: "CTA" },
];

export function HomeEditor({ content }: { content: HomeContent }) {
  const [tab, setTab] = React.useState<Tab>("hero");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "hero" ? <HeroSection initial={content.hero} /> : null}
      {tab === "about" ? <AboutSection initial={content.about} /> : null}
      {tab === "markets" ? <MarketsSection items={content.markets} /> : null}
      {tab === "process" ? <ProcessSection items={content.process} /> : null}
      {tab === "testimonials" ? (
        <TestimonialsSection items={content.testimonials} />
      ) : null}
      {tab === "trust" ? <TrustSection items={content.trust} /> : null}
      {tab === "press" ? <PressSection items={content.press} /> : null}
      {tab === "cta" ? <CtaSection initial={content.cta} /> : null}
    </div>
  );
}

// ---- shared helpers ---------------------------------------------

function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 3500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [msg]);
  return { msg, setMsg };
}

function Field({
  label,
  children,
  wide,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  hint?: string;
}) {
  return (
    <div className={`space-y-1 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <label className="text-xs font-medium">{label}</label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Submit({
  pending,
  msg,
  label = "Save",
}: {
  pending: boolean;
  msg: string | null;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

// ---- HERO -------------------------------------------------------

function HeroSection({ initial }: { initial: HomeContent["hero"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<HeroInput>({
    backgroundImageUrl: initial?.background_image_url ?? null,
    eyebrowText: initial?.eyebrow_text ?? "Licensed Realtor",
    eyebrowChips: initial?.eyebrow_chips ?? [],
    headlineTop: initial?.headline_top ?? "Property, found",
    headlineBottomItalic: initial?.headline_bottom_italic ?? "personally.",
    subtitle:
      initial?.subtitle ??
      "Apartments, villas and investment opportunities — handled by one person, not a platform.",
    primaryCtaLabel: initial?.primary_cta_label ?? "Browse properties",
    primaryCtaHref: initial?.primary_cta_href ?? "/properties",
    secondaryCtaLabel: initial?.secondary_cta_label ?? "Speak with me",
    secondaryCtaHref: initial?.secondary_cta_href ?? "/contact",
  });

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await saveHero(form);
        setPending(false);
        setMsg(result.ok ? "Hero saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Background image URL" wide hint="Full-bleed photo behind the hero copy.">
          <Input
            value={form.backgroundImageUrl ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                backgroundImageUrl: e.target.value || null,
              })
            }
            placeholder="https://…"
          />
        </Field>

        <Field label="Eyebrow text">
          <Input
            value={form.eyebrowText}
            onChange={(e) => setForm({ ...form, eyebrowText: e.target.value })}
          />
        </Field>
        <Field
          label="Eyebrow chips (CSV)"
          wide
          hint="Separator dots are added automatically. E.g. Dubai, New York, Toronto."
        >
          <Input
            value={form.eyebrowChips.join(", ")}
            onChange={(e) =>
              setForm({
                ...form,
                eyebrowChips: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 8),
              })
            }
          />
        </Field>

        <Field label="Headline (first line)">
          <Input
            value={form.headlineTop}
            onChange={(e) => setForm({ ...form, headlineTop: e.target.value })}
            required
          />
        </Field>
        <Field label="Headline (italic, accent)">
          <Input
            value={form.headlineBottomItalic}
            onChange={(e) =>
              setForm({ ...form, headlineBottomItalic: e.target.value })
            }
            required
          />
        </Field>
        <Field label="Subtitle" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </Field>

        <Field label="Primary CTA label">
          <Input
            value={form.primaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, primaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="Primary CTA href" hint="Internal e.g. /properties or absolute https://…">
          <Input
            value={form.primaryCtaHref}
            onChange={(e) =>
              setForm({ ...form, primaryCtaHref: e.target.value })
            }
          />
        </Field>
        <Field label="Secondary CTA label">
          <Input
            value={form.secondaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, secondaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="Secondary CTA href">
          <Input
            value={form.secondaryCtaHref}
            onChange={(e) =>
              setForm({ ...form, secondaryCtaHref: e.target.value })
            }
          />
        </Field>
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

// ---- ABOUT ------------------------------------------------------

function AboutSection({ initial }: { initial: HomeContent["about"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<AboutInput>({
    eyebrowText: initial?.eyebrow_text ?? "",
    headline: initial?.headline ?? "",
    body: initial?.body ?? "",
    portraitUrl: initial?.portrait_url ?? null,
    metric1Value: initial?.metric_1_value ?? null,
    metric1Label: initial?.metric_1_label ?? null,
    metric2Value: initial?.metric_2_value ?? null,
    metric2Label: initial?.metric_2_label ?? null,
    metric3Value: initial?.metric_3_value ?? null,
    metric3Label: initial?.metric_3_label ?? null,
    metric4Value: initial?.metric_4_value ?? null,
    metric4Label: initial?.metric_4_label ?? null,
  });

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await saveAbout(form);
        setPending(false);
        setMsg(result.ok ? "About saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Eyebrow text" wide>
          <Input
            value={form.eyebrowText}
            onChange={(e) => setForm({ ...form, eyebrowText: e.target.value })}
          />
        </Field>
        <Field label="Headline" wide>
          <Input
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            required
          />
        </Field>
        <Field label="Portrait URL" wide hint="Square or 4:5 portrait photo.">
          <Input
            value={form.portraitUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, portraitUrl: e.target.value || null })
            }
            placeholder="https://…"
          />
        </Field>
        <Field label="Body" wide hint="Plain text. Line breaks are preserved.">
          <textarea
            className="min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Field>

        {[1, 2, 3, 4].map((n) => {
          const vKey = `metric${n}Value` as
            | "metric1Value"
            | "metric2Value"
            | "metric3Value"
            | "metric4Value";
          const lKey = `metric${n}Label` as
            | "metric1Label"
            | "metric2Label"
            | "metric3Label"
            | "metric4Label";
          return (
            <React.Fragment key={n}>
              <Field label={`Metric ${n} value`}>
                <Input
                  value={form[vKey] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [vKey]: e.target.value || null })
                  }
                  placeholder="200+"
                />
              </Field>
              <Field label={`Metric ${n} label`}>
                <Input
                  value={form[lKey] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [lKey]: e.target.value || null })
                  }
                  placeholder="closed deals"
                />
              </Field>
              <div className="hidden lg:block" />
            </React.Fragment>
          );
        })}
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

// ---- CTA --------------------------------------------------------

function CtaSection({ initial }: { initial: HomeContent["cta"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<CtaInput>({
    eyebrowText: initial?.eyebrow_text ?? "",
    headlineLeft: initial?.headline_left ?? "Tell me what you",
    headlineItalic: initial?.headline_italic ?? "actually",
    headlineRight: initial?.headline_right ?? "need.",
    subtitle:
      initial?.subtitle ?? "One message. One reply within the hour.",
    primaryCtaLabel: initial?.primary_cta_label ?? "Send a message",
    primaryCtaHref: initial?.primary_cta_href ?? "/contact",
    secondaryCtaLabel: initial?.secondary_cta_label ?? "More about me",
    secondaryCtaHref: initial?.secondary_cta_href ?? "/about",
  });

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await saveCta(form);
        setPending(false);
        setMsg(result.ok ? "CTA saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Eyebrow text" wide>
          <Input
            value={form.eyebrowText}
            onChange={(e) => setForm({ ...form, eyebrowText: e.target.value })}
          />
        </Field>
        <Field label="Headline (left)">
          <Input
            value={form.headlineLeft}
            onChange={(e) =>
              setForm({ ...form, headlineLeft: e.target.value })
            }
            required
          />
        </Field>
        <Field label="Headline (italic accent)">
          <Input
            value={form.headlineItalic}
            onChange={(e) =>
              setForm({ ...form, headlineItalic: e.target.value })
            }
            required
          />
        </Field>
        <Field label="Headline (right)">
          <Input
            value={form.headlineRight}
            onChange={(e) =>
              setForm({ ...form, headlineRight: e.target.value })
            }
            required
          />
        </Field>
        <Field label="Subtitle" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </Field>
        <Field label="Primary CTA label">
          <Input
            value={form.primaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, primaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="Primary CTA href">
          <Input
            value={form.primaryCtaHref}
            onChange={(e) =>
              setForm({ ...form, primaryCtaHref: e.target.value })
            }
          />
        </Field>
        <Field label="Secondary CTA label">
          <Input
            value={form.secondaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, secondaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="Secondary CTA href">
          <Input
            value={form.secondaryCtaHref}
            onChange={(e) =>
              setForm({ ...form, secondaryCtaHref: e.target.value })
            }
          />
        </Field>
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

// ---- MARKETS ----------------------------------------------------

function MarketsSection({ items }: { items: HomeContent["markets"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const [draft, setDraft] = React.useState<MarketInput | null>(null);

  function blank(): MarketInput {
    return {
      id: null,
      sortOrder: items.length * 10,
      name: "",
      region: null,
      badge: null,
      blurb: null,
      imageUrl: null,
      href: "/properties",
      isFeatured: false,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Top-level destinations shown in the Markets grid. One can be marked
          featured — it gets the large block.
        </p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          Add market
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              {m.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image_url}
                  alt={m.name}
                  className="h-12 w-16 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-16 rounded bg-muted" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {m.name}{" "}
                  {m.is_featured ? (
                    <Badge variant="success" className="ml-1">
                      Featured
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{m.sort_order} · {m.region ?? "—"} · {m.badge ?? "no badge"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: m.id,
                    sortOrder: m.sort_order,
                    name: m.name,
                    region: m.region,
                    badge: m.badge,
                    blurb: m.blurb,
                    imageUrl: m.image_url,
                    href: m.href,
                    isFeatured: m.is_featured,
                  })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === m.id}
                onClick={async () => {
                  if (!confirm(`Delete "${m.name}"?`)) return;
                  setPendingId(m.id);
                  const r = await deleteHomeItem("home_markets", m.id);
                  setPendingId(null);
                  setMsg(r.ok ? "Market deleted." : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No markets yet.
          </li>
        ) : null}
      </ul>

      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}

      {draft ? (
        <MarketForm
          initial={draft}
          onCancel={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function MarketForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: MarketInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<MarketInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveMarket(form);
        setPending(false);
        if (r.ok) {
          setMsg("Market saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit market" : "New market"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Region">
          <Input
            value={form.region ?? ""}
            onChange={(e) =>
              setForm({ ...form, region: e.target.value || null })
            }
          />
        </Field>
        <Field label="Badge" hint="Shown above the title on the featured tile.">
          <Input
            value={form.badge ?? ""}
            onChange={(e) =>
              setForm({ ...form, badge: e.target.value || null })
            }
            placeholder="Primary market"
          />
        </Field>
        <Field label="Image URL" wide>
          <Input
            value={form.imageUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, imageUrl: e.target.value || null })
            }
            placeholder="https://…"
          />
        </Field>
        <Field label="Href" hint="Where the tile links to. Internal path like /properties.">
          <Input
            value={form.href ?? ""}
            onChange={(e) =>
              setForm({ ...form, href: e.target.value || null })
            }
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Blurb" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.blurb ?? ""}
            onChange={(e) =>
              setForm({ ...form, blurb: e.target.value || null })
            }
          />
        </Field>
        <Field label="Featured" hint="Only one market should be featured at a time.">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) =>
                setForm({ ...form, isFeatured: e.target.checked })
              }
            />
            <span>Show as the large hero tile</span>
          </label>
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save market"}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- PROCESS ----------------------------------------------------

function ProcessSection({ items }: { items: HomeContent["process"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<ProcessInput | null>(null);

  function blank(): ProcessInput {
    return {
      id: null,
      sortOrder: items.length * 10,
      stepNumber: String(items.length + 1).padStart(2, "0"),
      title: "",
      body: null,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ordered list of process steps. Number is displayed as italic accent.
        </p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          Add step
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <p className="text-sm font-medium">
                {s.step_number}. {s.title}
              </p>
              <p className="text-xs text-muted-foreground">
                #{s.sort_order} ·{" "}
                {s.body ? s.body.slice(0, 70) + (s.body.length > 70 ? "…" : "") : "no body"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: s.id,
                    sortOrder: s.sort_order,
                    stepNumber: s.step_number,
                    title: s.title,
                    body: s.body,
                  })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === s.id}
                onClick={async () => {
                  if (!confirm(`Delete step "${s.title}"?`)) return;
                  setPendingId(s.id);
                  const r = await deleteHomeItem("home_process_steps", s.id);
                  setPendingId(null);
                  setMsg(r.ok ? "Step deleted." : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No process steps yet.
          </li>
        ) : null}
      </ul>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {draft ? (
        <ProcessForm
          initial={draft}
          onCancel={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ProcessForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ProcessInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<ProcessInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveProcessStep(form);
        setPending(false);
        if (r.ok) {
          setMsg("Step saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit step" : "New step"}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Step number" hint='e.g. "01", "02".'>
          <Input
            value={form.stepNumber}
            onChange={(e) =>
              setForm({ ...form, stepNumber: e.target.value })
            }
            required
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Title" wide>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <Field label="Body" wide>
          <textarea
            className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.body ?? ""}
            onChange={(e) =>
              setForm({ ...form, body: e.target.value || null })
            }
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save step"}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- TESTIMONIALS ----------------------------------------------

function TestimonialsSection({ items }: { items: HomeContent["testimonials"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<TestimonialInput | null>(null);

  function blank(): TestimonialInput {
    return {
      id: null,
      sortOrder: items.length * 10,
      quote: "",
      authorName: null,
      dealLabel: null,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Client quotes shown as large italic blockquotes.
        </p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          Add testimonial
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((t) => (
          <li
            key={t.id}
            className="space-y-1 rounded-md border p-3"
          >
            <p className="text-sm italic">
              “{t.quote.slice(0, 120)}{t.quote.length > 120 ? "…" : ""}”
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                #{t.sort_order} · {t.author_name ?? "Anonymous"} ·{" "}
                {t.deal_label ?? "—"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      id: t.id,
                      sortOrder: t.sort_order,
                      quote: t.quote,
                      authorName: t.author_name,
                      dealLabel: t.deal_label,
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={pendingId === t.id}
                  onClick={async () => {
                    if (!confirm("Delete this testimonial?")) return;
                    setPendingId(t.id);
                    const r = await deleteHomeItem("home_testimonials", t.id);
                    setPendingId(null);
                    setMsg(r.ok ? "Testimonial deleted." : r.error);
                    if (r.ok) router.refresh();
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No testimonials yet.
          </li>
        ) : null}
      </ul>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {draft ? (
        <TestimonialForm
          initial={draft}
          onCancel={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function TestimonialForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: TestimonialInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<TestimonialInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveTestimonial(form);
        setPending(false);
        if (r.ok) {
          setMsg("Testimonial saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit testimonial" : "New testimonial"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Quote" wide>
          <textarea
            className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            required
          />
        </Field>
        <Field label="Author name">
          <Input
            value={form.authorName ?? ""}
            onChange={(e) =>
              setForm({ ...form, authorName: e.target.value || null })
            }
            placeholder="Sergey D."
          />
        </Field>
        <Field label="Deal label">
          <Input
            value={form.dealLabel ?? ""}
            onChange={(e) =>
              setForm({ ...form, dealLabel: e.target.value || null })
            }
            placeholder="Penthouse · Dubai Marina"
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save testimonial"}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- TRUST ------------------------------------------------------

function TrustSection({ items }: { items: HomeContent["trust"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<TrustInput | null>(null);

  function blank(): TrustInput {
    return {
      id: null,
      sortOrder: items.length * 10,
      label: "",
      sub: null,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Licenses, certifications and trust signals shown as a row.
        </p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          Add badge
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">
                #{t.sort_order} · {t.sub ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: t.id,
                    sortOrder: t.sort_order,
                    label: t.label,
                    sub: t.sub,
                  })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === t.id}
                onClick={async () => {
                  if (!confirm(`Delete "${t.label}"?`)) return;
                  setPendingId(t.id);
                  const r = await deleteHomeItem("home_trust_badges", t.id);
                  setPendingId(null);
                  setMsg(r.ok ? "Badge deleted." : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No trust badges yet.
          </li>
        ) : null}
      </ul>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {draft ? (
        <TrustForm
          initial={draft}
          onCancel={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function TrustForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: TrustInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<TrustInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveTrustBadge(form);
        setPending(false);
        if (r.ok) {
          setMsg("Badge saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit badge" : "New badge"}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Label">
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
            placeholder="RERA"
          />
        </Field>
        <Field label="Subtitle">
          <Input
            value={form.sub ?? ""}
            onChange={(e) => setForm({ ...form, sub: e.target.value || null })}
            placeholder="Dubai · #58432"
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save badge"}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- PRESS ------------------------------------------------------

function PressSection({ items }: { items: HomeContent["press"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<PressInput | null>(null);

  function blank(): PressInput {
    return {
      id: null,
      sortOrder: items.length * 10,
      name: "",
      logoUrl: null,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Press / publications shown in the &quot;As seen in&quot; row. Use a
          logo URL or just a name.
        </p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          Add press
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              {p.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logo_url}
                  alt={p.name}
                  className="h-6 w-auto"
                />
              ) : (
                <span className="text-sm italic">{p.name}</span>
              )}
              <p className="text-xs text-muted-foreground">
                #{p.sort_order} · {p.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: p.id,
                    sortOrder: p.sort_order,
                    name: p.name,
                    logoUrl: p.logo_url,
                  })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === p.id}
                onClick={async () => {
                  if (!confirm(`Delete "${p.name}"?`)) return;
                  setPendingId(p.id);
                  const r = await deleteHomeItem("home_press_logos", p.id);
                  setPendingId(null);
                  setMsg(r.ok ? "Press deleted." : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No press logos yet.
          </li>
        ) : null}
      </ul>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {draft ? (
        <PressForm
          initial={draft}
          onCancel={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function PressForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: PressInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<PressInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await savePressLogo(form);
        setPending(false);
        if (r.ok) {
          setMsg("Press saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit press" : "New press"}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Forbes"
          />
        </Field>
        <Field label="Logo URL" wide>
          <Input
            value={form.logoUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, logoUrl: e.target.value || null })
            }
            placeholder="https://… (optional)"
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save press"}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}
