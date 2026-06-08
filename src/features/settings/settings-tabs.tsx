"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  changeMemberRole,
  changePassword,
  inviteMember,
  removeMember,
  toggleModule,
  updateAgentProfile,
  updateBranding,
  updateLocalization,
  updateProfile,
  updateSiteContact,
  type AgentProfileInput,
  type BrandingInput,
  type LocalizationInput,
  type ProfileInput,
  type SiteContactInput,
} from "./actions";
import {
  DomainsSection,
  type DomainRow,
} from "@/features/settings/domains-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES, CURRENCY_CONFIG } from "@/lib/currency/config";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type SF = Dictionary["settingsForm"];

type Tab =
  | "profile"
  | "branding"
  | "contact"
  | "localization"
  | "modules"
  | "team"
  | "domains";

interface MemberRow {
  userId: string;
  email: string;
  roleId: string;
  status: string;
}

interface ModuleRow {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
}

interface RoleRow {
  id: string;
  key: string;
  name: string;
}

interface Props {
  profile: { fullName: string; avatarUrl: string; bio: string; phone: string };
  agentProfile: AgentProfileInput;
  branding: BrandingInput;
  siteContact: SiteContactInput;
  localization: LocalizationInput;
  modules: ModuleRow[];
  members: MemberRow[];
  roles: RoleRow[];
  currentUserId: string;
  domains: DomainRow[];
  canManageDomains: boolean;
}

const TABS: { key: Tab; labelKey: keyof SF }[] = [
  { key: "profile", labelKey: "tabProfile" },
  { key: "branding", labelKey: "tabBranding" },
  { key: "contact", labelKey: "tabContact" },
  { key: "localization", labelKey: "tabLocalization" },
  { key: "modules", labelKey: "tabModules" },
  { key: "team", labelKey: "tabTeam" },
  { key: "domains", labelKey: "tabDomains" },
];

export function SettingsTabs(props: Props) {
  const [tab, setTab] = React.useState<Tab>("profile");
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
            {dict.settingsForm[ti.labelKey]}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="space-y-4">
          <ProfileSection initial={props.profile} />
          <AgentProfileSection initial={props.agentProfile} />
          <PasswordSection />
        </div>
      ) : null}
      {tab === "branding" ? <BrandingSection initial={props.branding} /> : null}
      {tab === "contact" ? (
        <SiteContactSection initial={props.siteContact} />
      ) : null}
      {tab === "localization" ? (
        <LocalizationSection initial={props.localization} />
      ) : null}
      {tab === "modules" ? <ModulesSection modules={props.modules} /> : null}
      {tab === "team" ? (
        <TeamSection
          members={props.members}
          roles={props.roles}
          currentUserId={props.currentUserId}
        />
      ) : null}

      {tab === "domains" ? (
        <DomainsSection
          domains={props.domains}
          canManage={props.canManageDomains}
        />
      ) : null}
    </div>
  );
}

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

function ProfileSection({
  initial,
}: {
  initial: { fullName: string; avatarUrl: string; bio: string; phone: string };
}) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({ ...initial });
  return (
    <form
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateProfile({
          fullName: form.fullName,
          avatarUrl: form.avatarUrl || null,
          bio: form.bio || null,
          phone: form.phone || null,
        } satisfies ProfileInput);
        setPending(false);
        setMsg(result.ok ? sf.profileSaved : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="fFullName">
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </Field>
        <Field label="fAvatarUrl">
          <Input
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <Field label="fPhone">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="fBio" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </Field>
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

function AgentProfileSection({ initial }: { initial: AgentProfileInput }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<AgentProfileInput>({ ...initial });
  const set =
    (key: keyof AgentProfileInput) => (value: string) =>
      setForm((f) => ({ ...f, [key]: value || null }));

  return (
    <form
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateAgentProfile(form);
        setPending(false);
        setMsg(result.ok ? sf.publicProfileSaved : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div>
        <p className="text-sm font-semibold">{sf.hPublicAgentProfile}</p>
        <p className="text-xs text-muted-foreground">
          {sf.agentProfileHint}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="fTitle">
          <Input
            value={form.title ?? ""}
            onChange={(e) => set("title")(e.target.value)}
            placeholder="Senior Property Consultant"
          />
        </Field>
        <Field label="fSpecialization">
          <Input
            value={form.specialization ?? ""}
            onChange={(e) => set("specialization")(e.target.value)}
            placeholder="Luxury residential · Downtown"
          />
        </Field>
        <Field label="fReraNumber">
          <Input
            value={form.reraNumber ?? ""}
            onChange={(e) => set("reraNumber")(e.target.value)}
          />
        </Field>
        <Field label="fPublicPhone">
          <Input
            value={form.phone ?? ""}
            onChange={(e) => set("phone")(e.target.value)}
            placeholder="+971 50 000 0000"
          />
        </Field>
        <Field label="fPhotoUrl" wide>
          <Input
            value={form.photoUrl ?? ""}
            onChange={(e) => set("photoUrl")(e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="fBio" wide>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.bio ?? ""}
            onChange={(e) => set("bio")(e.target.value)}
          />
        </Field>
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

function BrandingSection({ initial }: { initial: BrandingInput }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<BrandingInput>({ ...initial });
  return (
    <form
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateBranding(form);
        setPending(false);
        setMsg(result.ok ? sf.brandingSaved : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="fPrimaryColor">
          <Input
            value={form.primaryColor ?? ""}
            onChange={(e) =>
              setForm({ ...form, primaryColor: e.target.value || null })
            }
            placeholder="#0F172A"
          />
        </Field>
        <Field label="fSecondaryColor">
          <Input
            value={form.secondaryColor ?? ""}
            onChange={(e) =>
              setForm({ ...form, secondaryColor: e.target.value || null })
            }
          />
        </Field>
        <Field label="fAccentColor">
          <Input
            value={form.accentColor ?? ""}
            onChange={(e) =>
              setForm({ ...form, accentColor: e.target.value || null })
            }
          />
        </Field>
        <Field label="fLogoUrl" wide>
          <Input
            value={form.logoUrl ?? ""}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value || null })}
            placeholder="https://…"
          />
        </Field>
        <Field label="fFaviconUrl" wide>
          <Input
            value={form.faviconUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, faviconUrl: e.target.value || null })
            }
            placeholder="https://…"
          />
        </Field>
        <Field label="fFontFamily" wide>
          <Input
            value={form.fontFamily ?? ""}
            onChange={(e) =>
              setForm({ ...form, fontFamily: e.target.value || null })
            }
            placeholder="Inter, system-ui, sans-serif"
          />
        </Field>
        <Field label="fCustomCss" wide>
          <textarea
            className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            value={form.customCss ?? ""}
            onChange={(e) =>
              setForm({ ...form, customCss: e.target.value || null })
            }
          />
        </Field>
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

function SiteContactSection({ initial }: { initial: SiteContactInput }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<SiteContactInput>({ ...initial });
  const set =
    (key: keyof SiteContactInput) => (value: string) =>
      setForm((f) => ({ ...f, [key]: value || null }));

  return (
    <form
      className="space-y-4 rounded-md border bg-card p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateSiteContact(form);
        setPending(false);
        setMsg(result.ok ? sf.siteContactSaved : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <p className="text-xs text-muted-foreground">
        {sf.siteContactHint}
      </p>

      <div>
        <p className="mb-2 text-sm font-semibold">{sf.hContact}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="fContactEmail">
            <Input
              value={form.contactEmail ?? ""}
              onChange={(e) => set("contactEmail")(e.target.value)}
              placeholder="hello@example.com"
            />
          </Field>
          <Field label="fPhone">
            <Input
              value={form.contactPhone ?? ""}
              onChange={(e) => set("contactPhone")(e.target.value)}
              placeholder="+971 50 000 0000"
            />
          </Field>
          <Field label="fWhatsapp">
            <Input
              value={form.contactWhatsapp ?? ""}
              onChange={(e) => set("contactWhatsapp")(e.target.value)}
              placeholder="https://wa.me/9715… or +971…"
            />
          </Field>
          <Field label="fMessenger">
            <Input
              value={form.contactMessenger ?? ""}
              onChange={(e) => set("contactMessenger")(e.target.value)}
              placeholder="https://m.me/yourpage"
            />
          </Field>
          <Field label="fOfficeAddress">
            <Input
              value={form.contactAddress ?? ""}
              onChange={(e) => set("contactAddress")(e.target.value)}
              placeholder="Gate Avenue, DIFC — Dubai"
            />
          </Field>
          <Field label="fOfficeHours">
            <Input
              value={form.officeHours ?? ""}
              onChange={(e) => set("officeHours")(e.target.value)}
              placeholder="Mon – Sat · 10:00 – 19:00 GST"
            />
          </Field>
          <Field label="fResponseTime">
            <Input
              value={form.responseTime ?? ""}
              onChange={(e) => set("responseTime")(e.target.value)}
              placeholder="Within 1 hour"
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{sf.hHeader}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="fHeaderTagline">
            <Input
              value={form.headerTagline ?? ""}
              onChange={(e) => set("headerTagline")(e.target.value)}
              placeholder="Licensed Realtor"
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{sf.hFooter}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="fFooterTagline" wide>
            <textarea
              className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.footerTagline ?? ""}
              onChange={(e) => set("footerTagline")(e.target.value)}
              placeholder="Independent RERA-licensed realtor. Dubai only."
            />
          </Field>
          <Field label="fNewsletterTitle">
            <Input
              value={form.newsletterTitle ?? ""}
              onChange={(e) => set("newsletterTitle")(e.target.value)}
              placeholder="Quarterly market reports"
            />
          </Field>
          <Field label="fNewsletterBlurb">
            <Input
              value={form.newsletterBlurb ?? ""}
              onChange={(e) => set("newsletterBlurb")(e.target.value)}
              placeholder="Four issues per year, no filler."
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{sf.hSocialLinks}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="fInstagramUrl">
            <Input
              value={form.socialInstagram ?? ""}
              onChange={(e) => set("socialInstagram")(e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
          <Field label="fLinkedinUrl">
            <Input
              value={form.socialLinkedin ?? ""}
              onChange={(e) => set("socialLinkedin")(e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
          <Field label="fFacebookUrl">
            <Input
              value={form.socialFacebook ?? ""}
              onChange={(e) => set("socialFacebook")(e.target.value)}
              placeholder="https://facebook.com/…"
            />
          </Field>
          <Field label="fXUrl">
            <Input
              value={form.socialX ?? ""}
              onChange={(e) => set("socialX")(e.target.value)}
              placeholder="https://x.com/…"
            />
          </Field>
          <Field label="fYoutubeUrl">
            <Input
              value={form.socialYoutube ?? ""}
              onChange={(e) => set("socialYoutube")(e.target.value)}
              placeholder="https://youtube.com/@…"
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{sf.hAcquisitionFees}</p>
        <p className="mb-2 text-xs text-muted-foreground">
          {sf.acqFeesHint}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="fTransferFee">
            <Input
              type="number"
              step="0.01"
              value={form.acqTransferPct}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  acqTransferPct: Number(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="fAgencyFee">
            <Input
              type="number"
              step="0.01"
              value={form.acqAgencyPct}
              onChange={(e) =>
                setForm((f) => ({ ...f, acqAgencyPct: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="fRegistration">
            <Input
              type="number"
              step="0.01"
              value={form.acqRegistrationPct}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  acqRegistrationPct: Number(e.target.value),
                }))
              }
            />
          </Field>
        </div>
      </div>

      <Submit pending={pending} msg={msg} />
    </form>
  );
}

function PasswordSection() {
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [pending, setPending] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  return (
    <form
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (password !== confirm) {
          setMsg(sf.passwordsNoMatch);
          return;
        }
        setPending(true);
        const result = await changePassword({ newPassword: password });
        setPending(false);
        setMsg(result.ok ? sf.passwordChanged : result.error);
        if (result.ok) {
          setPassword("");
          setConfirm("");
        }
      }}
    >
      <p className="text-sm font-medium">{sf.changePassword}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="fNewPassword">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="fConfirmPassword">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

function LocalizationSection({ initial }: { initial: LocalizationInput }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<LocalizationInput>({ ...initial });

  // --- Языки: чекбокс = включён, радио = основной (всегда включён + fallback) ---
  function toggleLanguage(code: string, on: boolean) {
    setForm((f) => {
      let enabled = on
        ? Array.from(new Set([...f.enabledLanguages, code]))
        : f.enabledLanguages.filter((c) => c !== code);
      if (enabled.length === 0) enabled = [f.defaultLanguage];
      const def = enabled.includes(f.defaultLanguage)
        ? f.defaultLanguage
        : enabled[0]!;
      return { ...f, enabledLanguages: enabled, defaultLanguage: def };
    });
  }
  function setPrimaryLanguage(code: string) {
    setForm((f) => ({
      ...f,
      defaultLanguage: code,
      enabledLanguages: Array.from(new Set([...f.enabledLanguages, code])),
    }));
  }
  // --- Валюты: аналогично (чекбокс = включена, радио = валюта по умолчанию) ---
  function toggleCurrency(code: string, on: boolean) {
    setForm((f) => {
      let enabled = on
        ? Array.from(new Set([...f.enabledCurrencies, code]))
        : f.enabledCurrencies.filter((c) => c !== code);
      if (enabled.length === 0) enabled = [f.defaultCurrency];
      const def = enabled.includes(f.defaultCurrency)
        ? f.defaultCurrency
        : enabled[0]!;
      return { ...f, enabledCurrencies: enabled, defaultCurrency: def };
    });
  }
  function setPrimaryCurrency(code: string) {
    setForm((f) => ({
      ...f,
      defaultCurrency: code,
      enabledCurrencies: Array.from(new Set([...f.enabledCurrencies, code])),
    }));
  }

  return (
    <form
      className="space-y-3 rounded-md border bg-card p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateLocalization(form);
        setPending(false);
        setMsg(result.ok ? sf.localizationSaved : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <Field label="fOrganizationName">
        <Input
          value={form.organizationName}
          onChange={(e) =>
            setForm({ ...form, organizationName: e.target.value })
          }
        />
      </Field>
      <Field label="fLanguages">
        <p className="mb-2 text-xs text-muted-foreground">
          {sf.langHint}
        </p>
        <div className="space-y-1.5">
          {LOCALES.map((code) => {
            const on = form.enabledLanguages.includes(code);
            const isPrimary = form.defaultLanguage === code;
            const atMax = form.enabledLanguages.length >= 6;
            return (
              <div
                key={code}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={isPrimary || (!on && atMax)}
                    onChange={(e) => toggleLanguage(code, e.target.checked)}
                  />
                  <span>{LOCALE_LABELS[code]}</span>
                  <code className="text-xs text-muted-foreground">{code}</code>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name="primary-language"
                    checked={isPrimary}
                    onChange={() => setPrimaryLanguage(code)}
                  />
                  {sf.primary}
                </label>
              </div>
            );
          })}
        </div>
      </Field>
      <Field label="fCurrencies">
        <p className="mb-2 text-xs text-muted-foreground">
          {sf.currHint}
        </p>
        <div className="space-y-1.5">
          {CURRENCIES.map((code) => {
            const on = form.enabledCurrencies.includes(code);
            const isPrimary = form.defaultCurrency === code;
            return (
              <div
                key={code}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={isPrimary}
                    onChange={(e) => toggleCurrency(code, e.target.checked)}
                  />
                  <span>
                    {CURRENCY_CONFIG[code].symbol} {CURRENCY_CONFIG[code].name}
                  </span>
                  <code className="text-xs text-muted-foreground">{code}</code>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name="primary-currency"
                    checked={isPrimary}
                    onChange={() => setPrimaryCurrency(code)}
                  />
                  {sf.defaultLabel}
                </label>
              </div>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="fTimezone">
          <Input
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </Field>
        <Field label="fMeasurementSystem">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.measurementSystem}
            onChange={(e) =>
              setForm({
                ...form,
                measurementSystem: e.target.value as "metric" | "imperial",
              })
            }
          >
            <option value="metric">{sf.metric}</option>
            <option value="imperial">{sf.imperial}</option>
          </select>
        </Field>
      </div>
      <Submit pending={pending} msg={msg} />
    </form>
  );
}

function ModulesSection({ modules }: { modules: ModuleRow[] }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm">
      <ul className="space-y-2">
        {modules.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-2 text-sm"
          >
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                <code>{m.key}</code>
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={m.enabled}
                disabled={pendingId === m.id}
                onChange={async (event) => {
                  setPendingId(m.id);
                  const result = await toggleModule({
                    moduleId: m.id,
                    enabled: event.target.checked,
                  });
                  setPendingId(null);
                  setMsg(result.ok ? sf.moduleUpdated : result.error);
                  if (result.ok) router.refresh();
                }}
              />
              <span>{m.enabled ? sf.enabled : sf.disabled}</span>
            </label>
          </li>
        ))}
      </ul>
      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}

function TeamSection({
  members,
  roles,
  currentUserId,
}: {
  members: MemberRow[];
  roles: RoleRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const { dict } = useI18n();
  const sf = dict.settingsForm;
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRoleId, setInviteRoleId] = React.useState(roles[0]?.id ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleInvite() {
    if (!inviteEmail || !inviteRoleId) {
      setMsg(sf.emailRoleRequired);
      return;
    }
    setPending(true);
    const result = await inviteMember({ email: inviteEmail, roleId: inviteRoleId });
    setPending(false);
    if (result.ok) {
      setInviteEmail("");
      setMsg(sf.memberAddedInvited);
      router.refresh();
    } else {
      setMsg(result.error);
    }
  }

  return (
    <div className="space-y-4 rounded-md border bg-card p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold">{sf.hMembers}</p>
        <ul className="mt-2 space-y-2">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div className="space-y-1">
                <p className="font-medium">{member.email}</p>
                <Badge variant="outline">{member.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                  defaultValue={member.roleId}
                  onChange={async (event) => {
                    const newRole = event.target.value;
                    const result = await changeMemberRole({
                      userId: member.userId,
                      roleId: newRole,
                    });
                    setMsg(result.ok ? sf.roleUpdated : result.error);
                    if (result.ok) router.refresh();
                  }}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {member.userId !== currentUserId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={async () => {
                      const result = await removeMember({ userId: member.userId });
                      setMsg(result.ok ? sf.memberRemoved : result.error);
                      if (result.ok) router.refresh();
                    }}
                  >
                    {sf.remove}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{sf.you}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-semibold">{sf.hInviteMember}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Input
            type="email"
            placeholder="new.member@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" type="button" onClick={handleInvite} disabled={pending}>
            {sf.invite}
          </Button>
          {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { dict } = useI18n();
  const t = dict.settingsForm as Record<string, string>;
  return (
    <div className={`space-y-1 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <label className="text-xs font-medium">{t[label] ?? label}</label>
      {children}
    </div>
  );
}

function Submit({ pending, msg }: { pending: boolean; msg: string | null }) {
  const { dict } = useI18n();
  const t = dict.settingsForm;
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" type="submit" disabled={pending}>
        {t.save}
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
