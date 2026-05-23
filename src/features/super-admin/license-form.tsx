"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createLicense } from "@/features/super-admin/license-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Organization {
  id: string;
  name: string;
}

interface FormState {
  organizationId: string;
  installationType:
    | "solo_realtor_installation"
    | "agency_installation"
    | "property_management_installation"
    | "custom_installation";
  clientName: string;
  clientEmail: string;
  domain: string;
  productVersion: string;
  supportUntil: string;
  updatesUntil: string;
  expiresAt: string;
  notes: string;
}

const INSTALLATION_TYPE_LABELS: Record<
  FormState["installationType"],
  string
> = {
  solo_realtor_installation: "Solo realtor installation",
  agency_installation: "Agency installation",
  property_management_installation: "Property management installation",
  custom_installation: "Custom installation",
};

const EMPTY_FORM: FormState = {
  organizationId: "",
  installationType: "agency_installation",
  clientName: "",
  clientEmail: "",
  domain: "",
  productVersion: "",
  supportUntil: "",
  updatesUntil: "",
  expiresAt: "",
  notes: "",
};

export function LicenseForm({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>({
    ...EMPTY_FORM,
    organizationId: organizations[0]?.id ?? "",
  });
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [issuedKey, setIssuedKey] = React.useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setPending(true);
    setMessage(null);
    setIssuedKey(null);
    const result = await createLicense({
      organizationId: form.organizationId,
      installationType: form.installationType,
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim() || null,
      domain: form.domain.trim() || null,
      productVersion: form.productVersion.trim() || null,
      supportUntil: form.supportUntil || null,
      updatesUntil: form.updatesUntil || null,
      expiresAt: form.expiresAt || null,
      notes: form.notes.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      setForm({ ...EMPTY_FORM, organizationId: form.organizationId });
      if (result.licenseKey) {
        setIssuedKey(result.licenseKey);
      }
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-3">
      {issuedKey ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Copy this license key</p>
          <p className="mt-1 break-all font-mono text-xs">{issuedKey}</p>
          <p className="mt-2 text-xs">
            Hand the key to the client; it identifies their installation.
          </p>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Organization</label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.organizationId}
            onChange={(event) => update("organizationId", event.target.value)}
          >
            {organizations.length === 0 ? (
              <option value="">— no organizations —</option>
            ) : (
              organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Installation type</label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.installationType}
            onChange={(event) =>
              update(
                "installationType",
                event.target.value as FormState["installationType"],
              )
            }
          >
            {Object.entries(INSTALLATION_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Client name</label>
          <Input
            value={form.clientName}
            onChange={(event) => update("clientName", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Client email</label>
          <Input
            value={form.clientEmail}
            onChange={(event) => update("clientEmail", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Production domain</label>
          <Input
            value={form.domain}
            onChange={(event) => update("domain", event.target.value)}
            placeholder="agency.example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Product version</label>
          <Input
            value={form.productVersion}
            onChange={(event) => update("productVersion", event.target.value)}
            placeholder="1.0.0"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Support until</label>
          <Input
            type="date"
            value={form.supportUntil}
            onChange={(event) => update("supportUntil", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Updates until</label>
          <Input
            type="date"
            value={form.updatesUntil}
            onChange={(event) => update("updatesUntil", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">License expires</label>
          <Input
            type="date"
            value={form.expiresAt}
            onChange={(event) => update("expiresAt", event.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium">Notes</label>
          <Input
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          type="button"
          onClick={handleSubmit}
          disabled={pending || !form.organizationId || !form.clientName.trim()}
        >
          Issue license
        </Button>
        {message ? (
          <span className="text-xs text-muted-foreground">{message}</span>
        ) : null}
      </div>
    </div>
  );
}
