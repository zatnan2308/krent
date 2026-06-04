"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  changeMemberRole,
  changePassword,
  inviteMember,
  removeMember,
  toggleModule,
  updateBranding,
  updateLocalization,
  updateProfile,
  updateSiteContact,
  type BrandingInput,
  type LocalizationInput,
  type ProfileInput,
  type SiteContactInput,
} from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab =
  | "profile"
  | "branding"
  | "contact"
  | "localization"
  | "modules"
  | "team";

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
  branding: BrandingInput;
  siteContact: SiteContactInput;
  localization: LocalizationInput;
  modules: ModuleRow[];
  members: MemberRow[];
  roles: RoleRow[];
  currentUserId: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "branding", label: "Branding" },
  { key: "contact", label: "Site & contact" },
  { key: "localization", label: "Localization" },
  { key: "modules", label: "Modules" },
  { key: "team", label: "Team" },
];

export function SettingsTabs(props: Props) {
  const [tab, setTab] = React.useState<Tab>("profile");
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

      {tab === "profile" ? (
        <div className="space-y-4">
          <ProfileSection initial={props.profile} />
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
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({ ...initial });
  return (
    <form
      className="space-y-3 rounded-md border p-4"
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
        setMsg(result.ok ? "Profile saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </Field>
        <Field label="Avatar URL">
          <Input
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Bio" wide>
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

function BrandingSection({ initial }: { initial: BrandingInput }) {
  const router = useRouter();
  const { msg, setMsg } = useToast();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<BrandingInput>({ ...initial });
  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateBranding(form);
        setPending(false);
        setMsg(result.ok ? "Branding saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Primary color">
          <Input
            value={form.primaryColor ?? ""}
            onChange={(e) =>
              setForm({ ...form, primaryColor: e.target.value || null })
            }
            placeholder="#0F172A"
          />
        </Field>
        <Field label="Secondary color">
          <Input
            value={form.secondaryColor ?? ""}
            onChange={(e) =>
              setForm({ ...form, secondaryColor: e.target.value || null })
            }
          />
        </Field>
        <Field label="Accent color">
          <Input
            value={form.accentColor ?? ""}
            onChange={(e) =>
              setForm({ ...form, accentColor: e.target.value || null })
            }
          />
        </Field>
        <Field label="Logo URL" wide>
          <Input
            value={form.logoUrl ?? ""}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value || null })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Favicon URL" wide>
          <Input
            value={form.faviconUrl ?? ""}
            onChange={(e) =>
              setForm({ ...form, faviconUrl: e.target.value || null })
            }
            placeholder="https://…"
          />
        </Field>
        <Field label="Font family" wide>
          <Input
            value={form.fontFamily ?? ""}
            onChange={(e) =>
              setForm({ ...form, fontFamily: e.target.value || null })
            }
            placeholder="Inter, system-ui, sans-serif"
          />
        </Field>
        <Field label="Custom CSS" wide>
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
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<SiteContactInput>({ ...initial });
  const set =
    (key: keyof SiteContactInput) => (value: string) =>
      setForm((f) => ({ ...f, [key]: value || null }));

  return (
    <form
      className="space-y-4 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateSiteContact(form);
        setPending(false);
        setMsg(result.ok ? "Site contact saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <p className="text-xs text-muted-foreground">
        Shown in the public header, footer and on the Contact page. Leave a
        field blank to hide it.
      </p>

      <div>
        <p className="mb-2 text-sm font-semibold">Contact</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Contact email">
            <Input
              value={form.contactEmail ?? ""}
              onChange={(e) => set("contactEmail")(e.target.value)}
              placeholder="hello@example.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.contactPhone ?? ""}
              onChange={(e) => set("contactPhone")(e.target.value)}
              placeholder="+971 50 000 0000"
            />
          </Field>
          <Field label="WhatsApp (link or number)">
            <Input
              value={form.contactWhatsapp ?? ""}
              onChange={(e) => set("contactWhatsapp")(e.target.value)}
              placeholder="https://wa.me/9715… or +971…"
            />
          </Field>
          <Field label="Messenger (m.me link)">
            <Input
              value={form.contactMessenger ?? ""}
              onChange={(e) => set("contactMessenger")(e.target.value)}
              placeholder="https://m.me/yourpage"
            />
          </Field>
          <Field label="Office address">
            <Input
              value={form.contactAddress ?? ""}
              onChange={(e) => set("contactAddress")(e.target.value)}
              placeholder="Gate Avenue, DIFC — Dubai"
            />
          </Field>
          <Field label="Office hours">
            <Input
              value={form.officeHours ?? ""}
              onChange={(e) => set("officeHours")(e.target.value)}
              placeholder="Mon – Sat · 10:00 – 19:00 GST"
            />
          </Field>
          <Field label="Response time">
            <Input
              value={form.responseTime ?? ""}
              onChange={(e) => set("responseTime")(e.target.value)}
              placeholder="Within 1 hour"
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Footer</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Footer tagline" wide>
            <textarea
              className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.footerTagline ?? ""}
              onChange={(e) => set("footerTagline")(e.target.value)}
              placeholder="Independent RERA-licensed realtor. Dubai only."
            />
          </Field>
          <Field label="Newsletter title">
            <Input
              value={form.newsletterTitle ?? ""}
              onChange={(e) => set("newsletterTitle")(e.target.value)}
              placeholder="Quarterly market reports"
            />
          </Field>
          <Field label="Newsletter blurb">
            <Input
              value={form.newsletterBlurb ?? ""}
              onChange={(e) => set("newsletterBlurb")(e.target.value)}
              placeholder="Four issues per year, no filler."
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Social links</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Instagram URL">
            <Input
              value={form.socialInstagram ?? ""}
              onChange={(e) => set("socialInstagram")(e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
          <Field label="LinkedIn URL">
            <Input
              value={form.socialLinkedin ?? ""}
              onChange={(e) => set("socialLinkedin")(e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
          <Field label="Facebook URL">
            <Input
              value={form.socialFacebook ?? ""}
              onChange={(e) => set("socialFacebook")(e.target.value)}
              placeholder="https://facebook.com/…"
            />
          </Field>
          <Field label="X (Twitter) URL">
            <Input
              value={form.socialX ?? ""}
              onChange={(e) => set("socialX")(e.target.value)}
              placeholder="https://x.com/…"
            />
          </Field>
          <Field label="YouTube URL">
            <Input
              value={form.socialYoutube ?? ""}
              onChange={(e) => set("socialYoutube")(e.target.value)}
              placeholder="https://youtube.com/@…"
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Acquisition fees</p>
        <p className="mb-2 text-xs text-muted-foreground">
          Percentages used in the buyer&apos;s total cost of acquisition on
          property pages.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Transfer fee %">
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
          <Field label="Agency fee %">
            <Input
              type="number"
              step="0.01"
              value={form.acqAgencyPct}
              onChange={(e) =>
                setForm((f) => ({ ...f, acqAgencyPct: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Registration %">
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
  const [pending, setPending] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (password !== confirm) {
          setMsg("Passwords do not match.");
          return;
        }
        setPending(true);
        const result = await changePassword({ newPassword: password });
        setPending(false);
        setMsg(result.ok ? "Password changed." : result.error);
        if (result.ok) {
          setPassword("");
          setConfirm("");
        }
      }}
    >
      <p className="text-sm font-medium">Change password</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="New password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password">
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
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<LocalizationInput>({ ...initial });
  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateLocalization(form);
        setPending(false);
        setMsg(result.ok ? "Localization saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <Field label="Organization name">
        <Input
          value={form.organizationName}
          onChange={(e) =>
            setForm({ ...form, organizationName: e.target.value })
          }
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Default language">
          <Input
            value={form.defaultLanguage}
            onChange={(e) =>
              setForm({ ...form, defaultLanguage: e.target.value })
            }
          />
        </Field>
        <Field label="Default currency">
          <Input
            value={form.defaultCurrency}
            onChange={(e) =>
              setForm({ ...form, defaultCurrency: e.target.value })
            }
          />
        </Field>
        <Field label="Enabled languages (CSV)">
          <Input
            value={form.enabledLanguages.join(",")}
            onChange={(e) =>
              setForm({
                ...form,
                enabledLanguages: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Enabled currencies (CSV)">
          <Input
            value={form.enabledCurrencies.join(",")}
            onChange={(e) =>
              setForm({
                ...form,
                enabledCurrencies: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Timezone">
          <Input
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </Field>
        <Field label="Measurement system">
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
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
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
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  return (
    <div className="rounded-md border p-4">
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
                  setMsg(result.ok ? "Module updated." : result.error);
                  if (result.ok) router.refresh();
                }}
              />
              <span>{m.enabled ? "Enabled" : "Disabled"}</span>
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
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRoleId, setInviteRoleId] = React.useState(roles[0]?.id ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleInvite() {
    if (!inviteEmail || !inviteRoleId) {
      setMsg("Email and role are required.");
      return;
    }
    setPending(true);
    const result = await inviteMember({ email: inviteEmail, roleId: inviteRoleId });
    setPending(false);
    if (result.ok) {
      setInviteEmail("");
      setMsg("Member added or invited.");
      router.refresh();
    } else {
      setMsg(result.error);
    }
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <p className="text-sm font-semibold">Members</p>
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
                    setMsg(result.ok ? "Role updated." : result.error);
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
                      setMsg(result.ok ? "Member removed." : result.error);
                      if (result.ok) router.refresh();
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">you</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-semibold">Invite member</p>
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
            Invite
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
  return (
    <div className={`space-y-1 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function Submit({ pending, msg }: { pending: boolean; msg: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" type="submit" disabled={pending}>
        Save
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
