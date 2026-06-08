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
  saveIntentOption,
  saveMarket,
  savePressLogo,
  saveProcessStep,
  saveReason,
  saveSection,
  saveStat,
  saveTestimonial,
  saveTrustBadge,
  type AboutInput,
  type CtaInput,
  type HeroInput,
  type IntentInput,
  type MarketInput,
  type PressInput,
  type ProcessInput,
  type ReasonInput,
  type SectionInput,
  type StatInput,
  type TestimonialInput,
  type TrustInput,
} from "./actions";
import type { HomeContent, HomeSection } from "./queries";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type HE = Dictionary["homeEditor"];

type Tab =
  | "hero"
  | "intent"
  | "about"
  | "why"
  | "stats"
  | "markets"
  | "testimonials"
  | "trust"
  | "sections"
  | "process"
  | "cta"
  | "press";

const TABS: { key: Tab; labelKey: keyof HE }[] = [
  { key: "hero", labelKey: "tabHero" },
  { key: "intent", labelKey: "tabIntent" },
  { key: "about", labelKey: "tabWelcome" },
  { key: "why", labelKey: "tabWhy" },
  { key: "stats", labelKey: "tabStats" },
  { key: "markets", labelKey: "tabCommunities" },
  { key: "testimonials", labelKey: "tabStories" },
  { key: "trust", labelKey: "tabPartners" },
  { key: "sections", labelKey: "tabSectionTitles" },
  { key: "process", labelKey: "tabProcess" },
  { key: "cta", labelKey: "tabCta" },
  { key: "press", labelKey: "tabPress" },
];

export function HomeEditor({ content }: { content: HomeContent }) {
  const [tab, setTab] = React.useState<Tab>("hero");
  const { dict } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-1 border-b">
        {TABS.map((ti) => (
          <button
            key={ti.key}
            type="button"
            onClick={() => setTab(ti.key)}
            aria-current={tab === ti.key ? "true" : undefined}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-all after:content-[''] ${
              tab === ti.key
                ? "text-foreground after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent"
            }`}
          >
            {dict.homeEditor[ti.labelKey]}
          </button>
        ))}
      </div>

      {tab === "hero" ? <HeroSection initial={content.hero} /> : null}
      {tab === "intent" ? <IntentSection items={content.intent} /> : null}
      {tab === "about" ? <AboutSection initial={content.about} /> : null}
      {tab === "why" ? <ReasonsSection items={content.reasons} /> : null}
      {tab === "stats" ? <StatsSection items={content.stats} /> : null}
      {tab === "sections" ? (
        <SectionsSection sections={content.sections} />
      ) : null}
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
  const { dict } = useI18n();
  const t = dict.homeEditor as Record<string, string>;
  return (
    <div className={`space-y-1 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <label className="text-xs font-medium">{t[label] ?? label}</label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{t[hint] ?? hint}</p>
      ) : null}
    </div>
  );
}

function Submit({
  pending,
  msg,
  label = "save",
}: {
  pending: boolean;
  msg: string | null;
  label?: string;
}) {
  const { dict } = useI18n();
  const t = dict.homeEditor as Record<string, string>;
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? t.saving : (t[label] ?? label)}
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
        <Field label="fBgImageUrl" wide hint="hintFullBleed">
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

        <Field label="fEyebrowText">
          <Input
            value={form.eyebrowText}
            onChange={(e) => setForm({ ...form, eyebrowText: e.target.value })}
          />
        </Field>
        <Field
          label="fEyebrowChips"
          wide
          hint="hintSeparatorDots"
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

        <Field label="fHeadlineFirst">
          <Input
            value={form.headlineTop}
            onChange={(e) => setForm({ ...form, headlineTop: e.target.value })}
            required
          />
        </Field>
        <Field label="fHeadlineItalicAccent2">
          <Input
            value={form.headlineBottomItalic}
            onChange={(e) =>
              setForm({ ...form, headlineBottomItalic: e.target.value })
            }
            required
          />
        </Field>
        <Field label="fSubtitle" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </Field>

        <Field label="fPrimaryCtaLabel">
          <Input
            value={form.primaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, primaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="fPrimaryCtaHref" hint="hintInternalProps">
          <Input
            value={form.primaryCtaHref}
            onChange={(e) =>
              setForm({ ...form, primaryCtaHref: e.target.value })
            }
          />
        </Field>
        <Field label="fSecondaryCtaLabel">
          <Input
            value={form.secondaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, secondaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="fSecondaryCtaHref">
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
    headlineAccent: initial?.headline_accent ?? null,
    headlineSuffix: initial?.headline_suffix ?? null,
    body2: initial?.body_2 ?? "",
    ctaLabel: initial?.cta_label ?? "More about me",
    ctaHref: initial?.cta_href ?? "/about",
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
        <Field label="fEyebrowText" wide>
          <Input
            value={form.eyebrowText}
            onChange={(e) => setForm({ ...form, eyebrowText: e.target.value })}
          />
        </Field>
        <Field
          label="fHeadlineLead"
          hint='Начало заголовка, напр. "A single broker,".'
        >
          <Input
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            required
          />
        </Field>
        <Field
          label="fHeadlineAccentRu"
          hint='Акцентное слово в середине, напр. "entirely".'
        >
          <Input
            value={form.headlineAccent ?? ""}
            onChange={(e) =>
              setForm({ ...form, headlineAccent: e.target.value || null })
            }
          />
        </Field>
        <Field
          label="fHeadlineSuffix"
          hint='Хвост после акцента, напр. "in your corner.".'
        >
          <Input
            value={form.headlineSuffix ?? ""}
            onChange={(e) =>
              setForm({ ...form, headlineSuffix: e.target.value || null })
            }
          />
        </Field>
        <Field label="fPortraitUrl" wide hint="hintSquarePortrait">
          <Input
            value={form.portraitUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, portraitUrl: e.target.value || null })
            }
            placeholder="https://…"
          />
        </Field>
        <Field label="fBodyP1" wide hint="hintPlainText">
          <textarea
            className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Field>
        <Field label="fBodyP2" wide hint="hintSecondPara">
          <textarea
            className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.body2}
            onChange={(e) => setForm({ ...form, body2: e.target.value })}
          />
        </Field>
        <Field label="fCtaLabel">
          <Input
            value={form.ctaLabel}
            onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
          />
        </Field>
        <Field label="fCtaHref" hint="hintInternalAbout">
          <Input
            value={form.ctaHref}
            onChange={(e) => setForm({ ...form, ctaHref: e.target.value })}
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
        <Field label="fEyebrowText" wide>
          <Input
            value={form.eyebrowText}
            onChange={(e) => setForm({ ...form, eyebrowText: e.target.value })}
          />
        </Field>
        <Field label="fHeadlineLeft">
          <Input
            value={form.headlineLeft}
            onChange={(e) =>
              setForm({ ...form, headlineLeft: e.target.value })
            }
            required
          />
        </Field>
        <Field label="fHeadlineItalicAccent">
          <Input
            value={form.headlineItalic}
            onChange={(e) =>
              setForm({ ...form, headlineItalic: e.target.value })
            }
            required
          />
        </Field>
        <Field label="fHeadlineRight">
          <Input
            value={form.headlineRight}
            onChange={(e) =>
              setForm({ ...form, headlineRight: e.target.value })
            }
            required
          />
        </Field>
        <Field label="fSubtitle" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </Field>
        <Field label="fPrimaryCtaLabel">
          <Input
            value={form.primaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, primaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="fPrimaryCtaHref">
          <Input
            value={form.primaryCtaHref}
            onChange={(e) =>
              setForm({ ...form, primaryCtaHref: e.target.value })
            }
          />
        </Field>
        <Field label="fSecondaryCtaLabel">
          <Input
            value={form.secondaryCtaLabel}
            onChange={(e) =>
              setForm({ ...form, secondaryCtaLabel: e.target.value })
            }
          />
        </Field>
        <Field label="fSecondaryCtaHref">
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
          {hed.descMarkets}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addMarket}
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
                      {hed.featured}
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{m.sort_order} · {m.region ?? "—"} · {m.badge ?? hed.noBadge}
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
                {hed.edit}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === m.id}
                onClick={async () => {
                  if (!confirm(hed.confirmDelete.replace("{name}", m.name))) return;
                  setPendingId(m.id);
                  const r = await deleteHomeItem("home_markets", m.id);
                  setPendingId(null);
                  setMsg(r.ok ? hed.marketDeleted : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                {hed.deleteBtn}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noMarkets}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
        <Field label="fName">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="fRegion">
          <Input
            value={form.region ?? ""}
            onChange={(e) =>
              setForm({ ...form, region: e.target.value || null })
            }
          />
        </Field>
        <Field label="fBadge" hint="hintAboveTitle">
          <Input
            value={form.badge ?? ""}
            onChange={(e) =>
              setForm({ ...form, badge: e.target.value || null })
            }
            placeholder="Primary market"
          />
        </Field>
        <Field label="fImageUrl" wide>
          <Input
            value={form.imageUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, imageUrl: e.target.value || null })
            }
            placeholder="https://…"
          />
        </Field>
        <Field label="fHref" hint="hintTileLink">
          <Input
            value={form.href ?? ""}
            onChange={(e) =>
              setForm({ ...form, href: e.target.value || null })
            }
          />
        </Field>
        <Field label="fSortOrder">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="fBlurb" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.blurb ?? ""}
            onChange={(e) =>
              setForm({ ...form, blurb: e.target.value || null })
            }
          />
        </Field>
        <Field label="fFeatured" hint="hintOneFeatured">
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
          {pending ? hed.saving : hed.saveMarket}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
          {hed.descProcess}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addStep}
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
                {hed.edit}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === s.id}
                onClick={async () => {
                  if (!confirm(hed.confirmDeleteStep.replace("{name}", s.title))) return;
                  setPendingId(s.id);
                  const r = await deleteHomeItem("home_process_steps", s.id);
                  setPendingId(null);
                  setMsg(r.ok ? hed.stepDeleted : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                {hed.deleteBtn}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noSteps}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
        <Field label="fStepNumber" hint='e.g. "01", "02".'>
          <Input
            value={form.stepNumber}
            onChange={(e) =>
              setForm({ ...form, stepNumber: e.target.value })
            }
            required
          />
        </Field>
        <Field label="fSortOrder">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="fTitle" wide>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <Field label="fBody" wide>
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
          {pending ? hed.saving : hed.saveStep}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
          {hed.descTestimonials}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addTestimonial}
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
                  {hed.edit}
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
                    setMsg(r.ok ? hed.testimonialDeleted : r.error);
                    if (r.ok) router.refresh();
                  }}
                >
                  {hed.deleteBtn}
                </Button>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noTestimonials}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
        <Field label="fQuote" wide>
          <textarea
            className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            required
          />
        </Field>
        <Field label="fAuthorName">
          <Input
            value={form.authorName ?? ""}
            onChange={(e) =>
              setForm({ ...form, authorName: e.target.value || null })
            }
            placeholder="Sergey D."
          />
        </Field>
        <Field label="fDealLabel">
          <Input
            value={form.dealLabel ?? ""}
            onChange={(e) =>
              setForm({ ...form, dealLabel: e.target.value || null })
            }
            placeholder="Penthouse · Dubai Marina"
          />
        </Field>
        <Field label="fSortOrder">
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
          {pending ? hed.saving : hed.saveTestimonial}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
          {hed.descTrust}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addBadge}
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
                {hed.edit}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === t.id}
                onClick={async () => {
                  if (!confirm(hed.confirmDelete.replace("{name}", t.label))) return;
                  setPendingId(t.id);
                  const r = await deleteHomeItem("home_trust_badges", t.id);
                  setPendingId(null);
                  setMsg(r.ok ? hed.badgeDeleted : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                {hed.deleteBtn}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noBadges}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
        <Field label="fLabel">
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
            placeholder="RERA"
          />
        </Field>
        <Field label="fSubtitle">
          <Input
            value={form.sub ?? ""}
            onChange={(e) => setForm({ ...form, sub: e.target.value || null })}
            placeholder="Dubai · #58432"
          />
        </Field>
        <Field label="fSortOrder">
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
          {pending ? hed.saving : hed.saveBadge}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
          {hed.descPress}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addPress}
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
                {hed.edit}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === p.id}
                onClick={async () => {
                  if (!confirm(hed.confirmDelete.replace("{name}", p.name))) return;
                  setPendingId(p.id);
                  const r = await deleteHomeItem("home_press_logos", p.id);
                  setPendingId(null);
                  setMsg(r.ok ? hed.pressDeleted : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                {hed.deleteBtn}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noPress}
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
  const { dict } = useI18n();
  const hed = dict.homeEditor;
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
        <Field label="fName">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Forbes"
          />
        </Field>
        <Field label="fLogoUrl" wide>
          <Input
            value={form.logoUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, logoUrl: e.target.value || null })
            }
            placeholder="https://… (optional)"
          />
        </Field>
        <Field label="fSortOrder">
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
          {pending ? hed.saving : hed.savePress}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- INTENT ("How can I help you?") -----------------------------

function IntentSection({ items }: { items: HomeContent["intent"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const hed = dict.homeEditor;
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<IntentInput | null>(null);

  function blank(): IntentInput {
    return {
      id: null,
      sortOrder: items.length * 10,
      title: "",
      description: null,
      href: "/properties",
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hed.descIntent}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addOption}
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((o) => (
          <li
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <p className="text-sm font-medium">{o.title}</p>
              <p className="text-xs text-muted-foreground">
                #{o.sort_order} · {o.href ?? "—"} ·{" "}
                {o.description
                  ? o.description.slice(0, 60) +
                    (o.description.length > 60 ? "…" : "")
                  : "no description"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: o.id,
                    sortOrder: o.sort_order,
                    title: o.title,
                    description: o.description,
                    href: o.href,
                  })
                }
              >
                {hed.edit}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === o.id}
                onClick={async () => {
                  if (!confirm(hed.confirmDelete.replace("{name}", o.title))) return;
                  setPendingId(o.id);
                  const r = await deleteHomeItem("home_intent_options", o.id);
                  setPendingId(null);
                  setMsg(r.ok ? hed.optionDeleted : r.error);
                  if (r.ok) router.refresh();
                }}
              >
                {hed.deleteBtn}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noOptions}
          </li>
        ) : null}
      </ul>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {draft ? (
        <IntentForm
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

function IntentForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: IntentInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const hed = dict.homeEditor;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<IntentInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveIntentOption(form);
        setPending(false);
        if (r.ok) {
          setMsg("Option saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit option" : "New option"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="fTitle">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="Buy a home"
          />
        </Field>
        <Field label="fHref" hint="hintInternalPath">
          <Input
            value={form.href ?? ""}
            onChange={(e) =>
              setForm({ ...form, href: e.target.value || null })
            }
          />
        </Field>
        <Field label="fSortOrder">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="fDescription" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.description ?? ""}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value || null })
            }
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? hed.saving : hed.saveOption}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- WHY (reasons) ----------------------------------------------

function ReasonsSection({ items }: { items: HomeContent["reasons"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const hed = dict.homeEditor;
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<ReasonInput | null>(null);

  function blank(): ReasonInput {
    return { id: null, sortOrder: items.length * 10, title: "", body: null };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hed.descReasons}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addReason}
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">
                #{r.sort_order} ·{" "}
                {r.body
                  ? r.body.slice(0, 70) + (r.body.length > 70 ? "…" : "")
                  : "no body"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: r.id,
                    sortOrder: r.sort_order,
                    title: r.title,
                    body: r.body,
                  })
                }
              >
                {hed.edit}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === r.id}
                onClick={async () => {
                  if (!confirm(hed.confirmDelete.replace("{name}", r.title))) return;
                  setPendingId(r.id);
                  const res = await deleteHomeItem("home_reasons", r.id);
                  setPendingId(null);
                  setMsg(res.ok ? hed.reasonDeleted : res.error);
                  if (res.ok) router.refresh();
                }}
              >
                {hed.deleteBtn}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noReasons}
          </li>
        ) : null}
      </ul>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {draft ? (
        <ReasonForm
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

function ReasonForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ReasonInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const hed = dict.homeEditor;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<ReasonInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveReason(form);
        setPending(false);
        if (r.ok) {
          setMsg("Reason saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit reason" : "New reason"}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="fTitle" wide>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="Off-market access"
          />
        </Field>
        <Field label="fSortOrder">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="fBody" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.body ?? ""}
            onChange={(e) =>
              setForm({ ...form, body: e.target.value || null })
            }
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? hed.saving : hed.saveReason}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- STATS (Advantage big numbers) ------------------------------

function StatsSection({ items }: { items: HomeContent["stats"] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const hed = dict.homeEditor;
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<StatInput | null>(null);

  function blank(): StatInput {
    return {
      id: null,
      sortOrder: items.length * 10,
      value: "",
      suffix: null,
      label: "",
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hed.descStats}</p>
        <Button size="sm" type="button" onClick={() => setDraft(blank())}>
          {hed.addStat}
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
                {s.value}
                {s.suffix ?? ""} — {s.label}
              </p>
              <p className="text-xs text-muted-foreground">#{s.sort_order}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: s.id,
                    sortOrder: s.sort_order,
                    value: s.value,
                    suffix: s.suffix,
                    label: s.label,
                  })
                }
              >
                {hed.edit}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={pendingId === s.id}
                onClick={async () => {
                  if (!confirm(hed.confirmDelete.replace("{name}", s.label))) return;
                  setPendingId(s.id);
                  const res = await deleteHomeItem("home_stats", s.id);
                  setPendingId(null);
                  setMsg(res.ok ? hed.statDeleted : res.error);
                  if (res.ok) router.refresh();
                }}
              >
                {hed.deleteBtn}
              </Button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {hed.noStats}
          </li>
        ) : null}
      </ul>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {draft ? (
        <StatForm
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

function StatForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: StatInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const hed = dict.homeEditor;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<StatInput>(initial);
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveStat(form);
        setPending(false);
        if (r.ok) {
          setMsg("Stat saved.");
          onSaved();
        } else {
          setMsg(r.error);
        }
      }}
    >
      <p className="text-sm font-semibold">
        {form.id ? "Edit stat" : "New stat"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="fValue" hint='Напр. "200", "$2.4".'>
          <Input
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            required
            placeholder="200"
          />
        </Field>
        <Field label="fSuffix" hint='Акцентный хвост: "+", "M", " yrs".'>
          <Input
            value={form.suffix ?? ""}
            onChange={(e) =>
              setForm({ ...form, suffix: e.target.value || null })
            }
            placeholder="+"
          />
        </Field>
        <Field label="fLabel">
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
            placeholder="Deals closed"
          />
        </Field>
        <Field label="fSortOrder">
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
          {pending ? hed.saving : hed.saveStat}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>
          {hed.cancel}
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  );
}

// ---- SECTION TITLES (home_sections, eyebrow/lead/accent) --------

const SECTION_DEFS: {
  key: SectionInput["sectionKey"];
  label: string;
  hasMedia?: boolean;
}[] = [
  { key: "intent", label: "Intent — “How can I help you?”" },
  { key: "featured", label: "Featured listings" },
  { key: "why", label: "Why work with…" },
  { key: "communities", label: "Communities / neighbourhoods" },
  { key: "stories", label: "Success stories" },
  { key: "subscribe", label: "Subscribe band", hasMedia: true },
];

function SectionsSection({
  sections,
}: {
  sections: HomeContent["sections"];
}) {
  const { dict } = useI18n();
  const hed = dict.homeEditor;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {hed.descSections}</p>
      {SECTION_DEFS.map((def) => (
        <SectionHeadingForm
          key={def.key}
          sectionKey={def.key}
          label={def.label}
          hasMedia={Boolean(def.hasMedia)}
          initial={sections[def.key]}
        />
      ))}
    </div>
  );
}

function SectionHeadingForm({
  sectionKey,
  label,
  hasMedia,
  initial,
}: {
  sectionKey: SectionInput["sectionKey"];
  label: string;
  hasMedia: boolean;
  initial: HomeSection | undefined;
}) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<SectionInput>({
    sectionKey,
    eyebrow: initial?.eyebrow ?? null,
    lead: initial?.lead ?? null,
    accent: initial?.accent ?? null,
    subtitle: initial?.subtitle ?? null,
    imageUrl: initial?.image_url ?? null,
  });

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const r = await saveSection(form);
        setPending(false);
        setMsg(r.ok ? "Saved." : r.error);
        if (r.ok) router.refresh();
      }}
    >
      <p className="text-sm font-semibold">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="fEyebrow">
          <Input
            value={form.eyebrow ?? ""}
            onChange={(e) =>
              setForm({ ...form, eyebrow: e.target.value || null })
            }
            placeholder="Where to begin"
          />
        </Field>
        <Field label="fLead">
          <Input
            value={form.lead ?? ""}
            onChange={(e) => setForm({ ...form, lead: e.target.value || null })}
            placeholder="How can I"
          />
        </Field>
        <Field label="fAccentGold">
          <Input
            value={form.accent ?? ""}
            onChange={(e) =>
              setForm({ ...form, accent: e.target.value || null })
            }
            placeholder="help you?"
          />
        </Field>
        {hasMedia ? (
          <>
            <Field label="fSubtitle" wide>
              <textarea
                className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.subtitle ?? ""}
                onChange={(e) =>
                  setForm({ ...form, subtitle: e.target.value || null })
                }
              />
            </Field>
            <Field label="fBgImageUrl" wide>
              <Input
                value={form.imageUrl ?? ""}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value || null })
                }
                placeholder="https://…"
              />
            </Field>
          </>
        ) : null}
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}
