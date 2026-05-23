"use client";

import * as React from "react";

import { track } from "@/features/analytics/track";
import { readAttribution } from "@/features/crm/attribution";
import { submitLead } from "@/features/crm/lead-actions";
import type { LeadFormKind } from "@/features/crm/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface KindConfig {
  showLocation: boolean;
  locationLabel: string;
  showBudget: boolean;
  showPreferredTime: boolean;
  submitLabel: string;
}

const KIND_CONFIG: Record<LeadFormKind, KindConfig> = {
  contact: {
    showLocation: false,
    locationLabel: "",
    showBudget: false,
    showPreferredTime: false,
    submitLabel: "Send inquiry",
  },
  showing: {
    showLocation: false,
    locationLabel: "",
    showBudget: false,
    showPreferredTime: true,
    submitLabel: "Request viewing",
  },
  valuation: {
    showLocation: true,
    locationLabel: "Property address",
    showBudget: false,
    showPreferredTime: false,
    submitLabel: "Request valuation",
  },
  rental: {
    showLocation: true,
    locationLabel: "Preferred location",
    showBudget: true,
    showPreferredTime: false,
    submitLabel: "Send inquiry",
  },
};

/** Читает выбранную валюту из cookie (для поля currency лида). */
function readCurrencyCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(/(?:^|; )krent_currency=([^;]*)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

interface LeadFormProps {
  kind: LeadFormKind;
  propertyId?: string | null;
  locale: string;
}

/** Публичная форма захвата лида. Server-side валидация — в submitLead (zod). */
export function LeadForm({ kind, propertyId = null, locale }: LeadFormProps) {
  const config = KIND_CONFIG[kind];
  const formId = React.useId();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [locationInterest, setLocationInterest] = React.useState("");
  const [budgetMin, setBudgetMin] = React.useState("");
  const [budgetMax, setBudgetMax] = React.useState("");
  const [preferredTime, setPreferredTime] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setPending(true);
    setError(null);

    const result = await submitLead({
      kind,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      message: message.trim() || null,
      propertyId,
      locationInterest: config.showLocation
        ? locationInterest.trim() || null
        : null,
      budgetMin: config.showBudget ? toNumber(budgetMin) : null,
      budgetMax: config.showBudget ? toNumber(budgetMax) : null,
      preferredTime: config.showPreferredTime
        ? preferredTime.trim() || null
        : null,
      locale,
      currency: readCurrencyCookie(),
      pagePath:
        typeof window !== "undefined" ? window.location.pathname : null,
      attribution: readAttribution(),
    });

    setPending(false);
    if (result.ok) {
      track("lead_form_submit", {
        entityType: propertyId ? "property" : undefined,
        entityId: propertyId ?? undefined,
        data: { kind },
      });
      setDone(true);
    } else {
      setError(result.error);
    }
  }

  if (done) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Thank you — your inquiry has been sent. An agent will contact you
        shortly.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor={`${formId}-name`} className="text-sm font-medium">
          Name
        </label>
        <Input
          id={`${formId}-name`}
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${formId}-email`} className="text-sm font-medium">
          Email
        </label>
        <Input
          id={`${formId}-email`}
          type="email"
          value={email}
          required
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${formId}-phone`} className="text-sm font-medium">
          Phone
        </label>
        <Input
          id={`${formId}-phone`}
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>

      {config.showLocation ? (
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-location`}
            className="text-sm font-medium"
          >
            {config.locationLabel}
          </label>
          <Input
            id={`${formId}-location`}
            value={locationInterest}
            onChange={(event) => setLocationInterest(event.target.value)}
          />
        </div>
      ) : null}

      {config.showBudget ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor={`${formId}-budget-min`}
              className="text-sm font-medium"
            >
              Budget from
            </label>
            <Input
              id={`${formId}-budget-min`}
              type="number"
              min={0}
              value={budgetMin}
              onChange={(event) => setBudgetMin(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`${formId}-budget-max`}
              className="text-sm font-medium"
            >
              Budget to
            </label>
            <Input
              id={`${formId}-budget-max`}
              type="number"
              min={0}
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {config.showPreferredTime ? (
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-time`}
            className="text-sm font-medium"
          >
            Preferred date / time
          </label>
          <Input
            id={`${formId}-time`}
            value={preferredTime}
            placeholder="e.g. Saturday morning"
            onChange={(event) => setPreferredTime(event.target.value)}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor={`${formId}-message`} className="text-sm font-medium">
          Message
        </label>
        <Textarea
          id={`${formId}-message`}
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : config.submitLabel}
      </Button>
    </form>
  );
}
